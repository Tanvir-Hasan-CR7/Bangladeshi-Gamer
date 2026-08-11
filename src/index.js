import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_FUNCTION_URL = process.env.SUPABASE_FUNCTION_URL || 'https://feyonbiluperwjnqpyqf.supabase.co/functions/v1/minecraft-leaderboard-sync';
const SYNC_TOKEN = process.env.AJLB_SYNC_TOKEN || process.env.SUPABASE_SYNC_TOKEN || 'fxcdr5ffdrhhythgytyhttf';
const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL_SECONDS || 60) * 1000;
const TOP_LIMIT = Number(process.env.TOP_LIMIT || 100);

// Parse custom LEADERBOARD_MAP if provided, or fallback to standard ajLeaderboards table names
function getLeaderboardMap() {
  const envMap = process.env.LEADERBOARD_MAP;
  if (envMap) {
    const map = {};
    envMap.split(',').forEach(pair => {
      const [key, val] = pair.split('=').map(s => s.trim());
      if (key && val) map[key] = val;
    });
    return map;
  }
  return {
    kills: 'ajlb_statistic_player_kills',
    deaths: 'ajlb_statistic_deaths',
    money: 'ajlb_vault_eco_balance_commas',
    playtime: 'ajlb_statistic_hours_played',
    blocks_broken: 'ajlb_statistic_mine_block',
    mob_kills: 'ajlb_statistic_mob_kills',
    votes: 'ajlb_votes'
  };
}

let pool = null;

function getMySQLPool() {
  if (!pool) {
    const host = process.env.MYSQL_HOST || '168.119.102.138';
    const port = Number(process.env.MYSQL_PORT || 3306);
    const user = process.env.MYSQL_USER || 'u168_50U0Rj2EOa';
    const password = process.env.MYSQL_PASSWORD ?? 'm@gOsxCyU2.=DaCka@THfhcf';
    const database = process.env.MYSQL_DATABASE || 's168_MainStore';

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 10000
    });
  }
  return pool;
}

/**
 * Adapter function to read leaderboard statistics for a specific board metric from MySQL.
 * @param {string} boardName Metric key (e.g. 'kills', 'deaths', 'money', etc.)
 * @param {string} tableName Target MySQL table name
 * @returns {Promise<Array<{uuid: string, name: string, score: number, rank: number}>>}
 */
export async function readLeaderboard(boardName, tableName) {
  const dbPool = getMySQLPool();
  
  // Verify target table exists
  const [tables] = await dbPool.execute('SHOW TABLES');
  const tableNames = tables.map(r => String(Object.values(r)[0] || ''));
  const actualTable = tableNames.find(t => t.toLowerCase() === tableName.toLowerCase());

  if (!actualTable) {
    console.warn(`[MYSQL] Table '${tableName}' for metric '${boardName}' does not exist in database. Skipping.`);
    return [];
  }

  // Inspect column names to find name, uuid, and value fields
  const [cols] = await dbPool.execute(`SHOW COLUMNS FROM \`${actualTable}\``);
  const colNames = cols.map(c => String(c.Field).toLowerCase());

  const valCol = colNames.find(c => ['value', 'score', 'amount', 'stat'].includes(c)) || colNames[1] || 'value';
  const nameCol = colNames.find(c => ['namecache', 'displaynamecache', 'name', 'username', 'player'].includes(c));
  const uuidCol = colNames.find(c => ['id', 'uuid', 'player_uuid'].includes(c)) || 'id';

  let sql = '';
  if (nameCol) {
    sql = `
      SELECT \`${uuidCol}\` AS uuid, \`${nameCol}\` AS username, \`${valCol}\` AS value 
      FROM \`${actualTable}\` 
      WHERE \`${nameCol}\` IS NOT NULL AND \`${nameCol}\` != ''
      ORDER BY (\`${valCol}\` + 0) DESC LIMIT ${TOP_LIMIT}
    `;
  } else {
    sql = `
      SELECT \`${uuidCol}\` AS uuid, \`${uuidCol}\` AS username, \`${valCol}\` AS value 
      FROM \`${actualTable}\` 
      ORDER BY (\`${valCol}\` + 0) DESC LIMIT ${TOP_LIMIT}
    `;
  }

  const [rows] = await dbPool.execute(sql);

  return rows.map((r, index) => ({
    uuid: String(r.uuid || `uuid-${index + 1}`),
    name: String(r.username || `Player${index + 1}`),
    score: Number(r.value || 0),
    rank: index + 1
  }));
}

/**
 * Sends a single metric leaderboard sync payload to Supabase Edge Function
 */
async function syncToSupabase(boardName, players) {
  if (!players || players.length === 0) {
    console.log(`[SYNC] ${boardName}: 0 players found, skipping Supabase request.`);
    return true;
  }

  console.log(`[SYNC] ${boardName}: ${players.length} players formatted`);

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleW9uYmlsdXBlcndqbnFweXFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNzczODcsImV4cCI6MjEwMTg1MzM4N30.HX1IcmCeWFew4HpRO91I1ehCbxBhX2kbcyvy_Q3_OIs';

  const response = await fetch(SUPABASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
      'x-sync-token': SYNC_TOKEN
    },
    body: JSON.stringify({
      leaderboard_type: boardName,
      players
    })
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Supabase returned non-JSON response (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok || !json?.success) {
    throw new Error(json?.error || json?.message || `Supabase sync failed with status ${response.status}`);
  }

  console.log(`[SUPABASE] ${boardName} synchronized successfully (${json.count || players.length} records)`);
  return true;
}

/**
 * Executes a full synchronization cycle across all configured metrics
 */
export async function runSyncCycle() {
  console.log(`\n[SYNC] Starting sync cycle at ${new Date().toISOString()}...`);
  const leaderboardMap = getLeaderboardMap();

  try {
    // Ping MySQL connection
    const dbPool = getMySQLPool();
    await dbPool.execute('SELECT 1');
    console.log('[MYSQL] Connected');
  } catch (err) {
    console.error(`[MYSQL ERROR] Failed to connect to MySQL: ${err.message}`);
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const [boardName, tableName] of Object.entries(leaderboardMap)) {
    try {
      const players = await readLeaderboard(boardName, tableName);
      await syncToSupabase(boardName, players);
      successCount++;
    } catch (err) {
      failCount++;
      console.error(`[ERROR] Synchronization failed for metric '${boardName}': ${err.message}`);
    }
  }

  console.log(`[SYNC] Sync cycle completed (${successCount} succeeded, ${failCount} failed)\n`);
}

// Global process management
let syncIntervalTimer = null;

function startDaemon() {
  console.log('====================================================');
  console.log('ajLeaderboards External Sync Service');
  console.log(`Target Supabase Edge Function: ${SUPABASE_FUNCTION_URL}`);
  console.log(`Sync Interval: ${SYNC_INTERVAL / 1000} seconds`);
  console.log('====================================================\n');

  // Initial sync cycle
  runSyncCycle().catch(err => console.error('[FATAL] Sync cycle crashed:', err));

  // Schedule recurring sync cycle
  syncIntervalTimer = setInterval(() => {
    runSyncCycle().catch(err => console.error('[FATAL] Sync cycle crashed:', err));
  }, SYNC_INTERVAL);
}

// Handle termination signals gracefully
const shutdown = async (signal) => {
  console.log(`\n[SYNC] Received ${signal}. Shutting down gracefully...`);
  if (syncIntervalTimer) clearInterval(syncIntervalTimer);
  if (pool) {
    try {
      await pool.end();
      console.log('[MYSQL] Connection pool closed.');
    } catch {}
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// If executed directly via `node src/index.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  startDaemon();
}
