import { inspectDatabase } from '../src/sync/database-inspector.js';
import { closeMySQLPool } from '../src/sync/mysql.js';

async function run() {
  try {
    const results = await inspectDatabase();
    console.log(`\nSuccessfully inspected ${results.length} tables.`);
    for (const r of results) {
      console.log(`\nTable: ${r.tableName} (${r.rowCount} rows)`);
      console.log(`Columns:`, r.columns.map(c => `${c.field}:${c.type}`).join(', '));
    }
  } catch (err: any) {
    console.error('Inspection failed:', err.message);
  } finally {
    await closeMySQLPool();
    process.exit(0);
  }
}

run();
