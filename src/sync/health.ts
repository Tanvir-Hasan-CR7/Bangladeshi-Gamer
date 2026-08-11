import { checkMySQLHealth } from './mysql.js';
import { checkSupabaseHealth } from './supabase.js';

export interface SyncServiceState {
  status: 'ok' | 'degraded' | 'error';
  mysqlConnected: boolean;
  supabaseConnected: boolean;
  lastSyncTimestamp: string | null;
  lastSyncDurationMs: number | null;
  totalSyncedMetrics: number;
  totalSyncedPlayers: number;
  lastError: string | null;
  syncCycleCount: number;
  serviceStartTime: string;
}

const serviceStartTime = new Date().toISOString();

let state: SyncServiceState = {
  status: 'ok',
  mysqlConnected: false,
  supabaseConnected: false,
  lastSyncTimestamp: null,
  lastSyncDurationMs: null,
  totalSyncedMetrics: 0,
  totalSyncedPlayers: 0,
  lastError: null,
  syncCycleCount: 0,
  serviceStartTime
};

export function updateSyncState(update: Partial<SyncServiceState>) {
  state = { ...state, ...update };
}

export async function getHealthReport() {
  const mysqlConnected = await checkMySQLHealth();
  const supabaseConnected = await checkSupabaseHealth();

  const isOk = mysqlConnected && supabaseConnected;

  updateSyncState({
    mysqlConnected,
    supabaseConnected,
    status: isOk ? 'ok' : 'degraded'
  });

  return {
    status: isOk ? 'ok' : 'degraded',
    mysql: mysqlConnected,
    supabase: supabaseConnected,
    lastSync: state.lastSyncTimestamp
  };
}

export async function getDetailedStatusReport() {
  const mysqlConnected = await checkMySQLHealth();
  const supabaseConnected = await checkSupabaseHealth();

  const uptimeSeconds = Math.floor((Date.now() - new Date(state.serviceStartTime).getTime()) / 1000);

  return {
    serviceName: 'ajlb-sync-service',
    status: state.status,
    uptimeSeconds,
    mysql: {
      connected: mysqlConnected,
    },
    supabase: {
      connected: supabaseConnected,
    },
    lastSync: {
      timestamp: state.lastSyncTimestamp,
      durationMs: state.lastSyncDurationMs,
      metricsProcessed: state.totalSyncedMetrics,
      recordsSynced: state.totalSyncedPlayers,
      error: state.lastError
    },
    metrics: {
      cycleCount: state.syncCycleCount,
      startTime: state.serviceStartTime
    }
  };
}
