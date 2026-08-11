import { loadConfig } from './src/sync/config.js';
import { runSyncCycle } from './src/sync/sync.js';
import { getHealthReport, getDetailedStatusReport } from './src/sync/health.js';
import { inspectAjlbReport, inspectDatabase } from './src/sync/database-inspector.js';
import { fetchMetricLeaderboard } from './src/sync/leaderboard.js';
import { executeReadOnlyQuery, checkMySQLHealth } from './src/sync/mysql.js';
import { getSupabaseClient } from './src/sync/supabase.js';
import { SyncLogger } from './src/sync/logger.js';

export {
  runSyncCycle as runAjLeaderboardsSync,
  getHealthReport,
  getDetailedStatusReport,
  inspectAjlbReport,
  inspectDatabase,
  fetchMetricLeaderboard,
  executeReadOnlyQuery,
  checkMySQLHealth,
  getSupabaseClient
};

// Check if running as main CLI script
const isMainScript = typeof process !== 'undefined' && Array.isArray(process.argv) && (
  process.argv[1]?.endsWith('sync-service.ts') || 
  process.argv[1]?.endsWith('sync-service.js')
);

if (isMainScript) {
  const isDaemon = process.argv.includes('--daemon') || process.argv.includes('--watch') || process.env.NODE_ENV === 'production';
  const cfg = loadConfig();

  if (isDaemon) {
    const intervalMs = cfg.sync.intervalSeconds * 1000;
    SyncLogger.info(`====================================================`);
    SyncLogger.info(` [AJLB Sync Service] Starting continuous daemon engine`);
    SyncLogger.info(` Sync Interval: Every ${cfg.sync.intervalSeconds} seconds`);
    SyncLogger.info(`====================================================`);

    // Initial pass
    runSyncCycle();

    // Loop
    setInterval(() => {
      runSyncCycle();
    }, intervalMs);
  } else {
    runSyncCycle().then((res) => {
      SyncLogger.info(`Single sync pass completed with status: ${res.success ? 'SUCCESS' : 'NO DATA'}`);
      process.exit(res.success ? 0 : 1);
    });
  }
}
