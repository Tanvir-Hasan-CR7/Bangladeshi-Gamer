import mysql from 'mysql2/promise';
import { loadConfig } from './config.js';
import { SyncLogger } from './logger.js';

let pool: mysql.Pool | null = null;

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    const cfg = loadConfig().mysql;
    const [hostname, defaultPort] = cfg.host.includes(':') 
      ? cfg.host.split(':') 
      : [cfg.host, cfg.port];

    SyncLogger.info(`Initializing MySQL Connection Pool -> ${cfg.user}@${hostname}:${defaultPort}/${cfg.database}`);

    pool = mysql.createPool({
      host: hostname,
      port: Number(defaultPort || 3306),
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      connectionLimit: cfg.connectionLimit,
      connectTimeout: cfg.connectTimeout,
      waitForConnections: true,
      queueLimit: 0,
    });
  }

  return pool;
}

export async function executeReadOnlyQuery<T = any>(sql: string, params: any[] = [], timeoutMs = 5000): Promise<T[]> {
  const p = getMySQLPool();
  
  const queryPromise = (async () => {
    const conn = await p.getConnection();
    try {
      const [rows] = await conn.query(sql, params);
      return rows as T[];
    } finally {
      conn.release();
    }
  })();

  const timeoutPromise = new Promise<T[]>((_, reject) => {
    setTimeout(() => reject(new Error(`MySQL Query Timed Out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([queryPromise, timeoutPromise]);
}

export async function checkMySQLHealth(): Promise<boolean> {
  try {
    const rows = await executeReadOnlyQuery('SELECT 1 as alive', [], 3000);
    return Array.isArray(rows) && rows.length > 0 && rows[0].alive === 1;
  } catch (err: any) {
    SyncLogger.warn(`MySQL Health check failed: ${err.message}`);
    return false;
  }
}

export async function closeMySQLPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      SyncLogger.info('MySQL Connection Pool closed gracefully.');
    } catch (e) {
      // Ignore
    }
    pool = null;
  }
}
