import { inspectAjlbReport } from '../src/sync/database-inspector.js';
import { closeMySQLPool } from '../src/sync/mysql.js';

async function run() {
  try {
    const report = await inspectAjlbReport();
    console.log(report);
  } catch (err: any) {
    console.error('AJLB Inspection failed:', err.message);
  } finally {
    await closeMySQLPool();
    process.exit(0);
  }
}

run();
