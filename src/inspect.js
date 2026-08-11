import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function inspect() {
  const host = process.env.MYSQL_HOST || '168.119.102.138';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'u168_50U0Rj2EOa';
  const password = process.env.MYSQL_PASSWORD ?? 'm@gOsxCyU2.=DaCka@THfhcf';
  const database = process.env.MYSQL_DATABASE || 's168_MainStore';
  const prefix = process.env.MYSQL_TABLE_PREFIX || 'ajlb_';

  console.log(`[INSPECT] Connecting to MySQL host=${host}, port=${port}, database=${database}, user=${user}, prefix=${prefix}`);
  console.log(`[INSPECT] Secrets (Password & Sync Token) hidden for security.`);

  let conn;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000
    });
    console.log(`[MYSQL] Connected successfully to database '${database}'`);

    const [rawTables] = await conn.execute('SHOW TABLES');
    const allTables = rawTables.map(r => String(Object.values(r)[0] || ''));
    
    const ajlbTables = allTables.filter(t => t.toLowerCase().startsWith(prefix.toLowerCase()));

    console.log(`\nFound ${allTables.length} total tables in database. ${ajlbTables.length} match prefix '${prefix}':\n`);

    for (const table of ajlbTables) {
      console.log(`====================================================`);
      console.log(`Table: ${table}`);
      console.log(`====================================================`);

      const [colsRaw] = await conn.execute(`SHOW COLUMNS FROM \`${table}\``);
      console.log('Columns:');
      for (const col of colsRaw) {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Key ? '[' + col.Key + ']' : ''}`);
      }

      const [sampleRows] = await conn.execute(`SELECT * FROM \`${table}\` LIMIT 3`);
      console.log(`Sample Data (${sampleRows.length} rows):`);
      console.log(JSON.stringify(sampleRows, null, 2));
      console.log('\n');
    }

    if (ajlbTables.length === 0) {
      console.log(`No tables found matching prefix '${prefix}'. All available tables:`, allTables);
    }
  } catch (err) {
    console.error(`[ERROR] Inspection failed: ${err.message}`);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

inspect();
