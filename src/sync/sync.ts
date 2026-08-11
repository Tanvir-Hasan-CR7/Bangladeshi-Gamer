import { loadConfig } from './config.js';
import { executeReadOnlyQuery } from './mysql.js';
import { fetchMetricLeaderboard } from './leaderboard.js';
import { sendMetricToSupabase } from './supabase.js';
import { updateSyncState } from './health.js';
import { SyncLogger } from './logger.js';

let isSyncRunning = false;

export async function runSyncCycle(): Promise<{
  success: boolean;
  message: string;
  metricsProcessed: number;
  recordsSynced: number;
  timestamp: string;
}> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Section 10: Prevent duplicate overlapping sync cycles
  if (isSyncRunning) {
    SyncLogger.warn('Previous sync cycle is still running. Skipping current trigger tick.');
    return {
      success: false,
      message: 'Sync cycle skipped: previous execution in progress.',
      metricsProcessed: 0,
      recordsSynced: 0,
      timestamp
    };
  }

  isSyncRunning = true;

  const cfg = loadConfig();
  SyncLogger.info(`Starting synchronization cycle at ${timestamp}...`);

  let totalMetricsProcessed = 0;
  let totalRecordsSynced = 0;
  let lastErrorMsg: string | null = null;

  try {
    // 1. Discover all tables in MySQL
    const rawTables = await executeReadOnlyQuery('SHOW TABLES', [], 5000);
    const tables = rawTables.map(r => String(Object.values(r)[0] || '')).filter(Boolean);

    SyncLogger.info(`MySQL database reachable with ${tables.length} tables.`);

    // 2. Iterate through configured metrics
    const metricsToSync = cfg.sync.metrics;

    for (const metric of metricsToSync) {
      try {
        const metricResult = await fetchMetricLeaderboard(metric, tables, cfg.sync.batchSize);
        if (metricResult.players.length > 0) {
          totalMetricsProcessed++;
          const syncRes = await sendMetricToSupabase(metricResult);
          if (syncRes.success) {
            totalRecordsSynced += syncRes.rowsUpserted;
          } else if (syncRes.error) {
            lastErrorMsg = syncRes.error;
          }
        }
      } catch (err: any) {
        SyncLogger.error(`Error processing metric "${metric}": ${err.message}`);
        lastErrorMsg = err.message;
      }
    }

    const durationMs = Date.now() - startTime;
    const isSuccess = totalRecordsSynced > 0 || totalMetricsProcessed > 0;
    const statusMsg = isSuccess
      ? `Completed sync cycle in ${durationMs}ms: Synced ${totalRecordsSynced} records across ${totalMetricsProcessed} metrics.`
      : `Sync cycle finished with 0 records synced (${lastErrorMsg || 'No data or database empty'}).`;

    SyncLogger.info(statusMsg);

    updateSyncState({
      lastSyncTimestamp: timestamp,
      lastSyncDurationMs: durationMs,
      totalSyncedMetrics: totalMetricsProcessed,
      totalSyncedPlayers: totalRecordsSynced,
      lastError: lastErrorMsg,
      syncCycleCount: (await import('./health.js')).getDetailedStatusReport().then(r => r.metrics.cycleCount + 1).catch(() => 1) as any
    });

    return {
      success: isSuccess,
      message: statusMsg,
      metricsProcessed: totalMetricsProcessed,
      recordsSynced: totalRecordsSynced,
      timestamp
    };

  } catch (globalErr: any) {
    SyncLogger.error(`Global failure during sync cycle: ${globalErr.message}`);
    updateSyncState({ lastError: globalErr.message });
    return {
      success: false,
      message: `Global failure: ${globalErr.message}`,
      metricsProcessed: 0,
      recordsSynced: 0,
      timestamp
    };
  } finally {
    isSyncRunning = false;
  }
}
