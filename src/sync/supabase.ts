import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { loadConfig } from './config.js';
import { MetricQueryResult } from './leaderboard.js';
import { SyncLogger } from './logger.js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = loadConfig().supabase;
  if (!cfg.url || !cfg.key) {
    SyncLogger.warn('Supabase URL or Key missing in configuration.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(cfg.url, cfg.key, {
      auth: { persistSession: false }
    });
  }

  return supabaseClient;
}

export async function sendMetricToSupabase(
  metricData: MetricQueryResult
): Promise<{ success: boolean; rowsUpserted: number; error?: string }> {
  const cfg = loadConfig().supabase;
  const client = getSupabaseClient();

  if (!client) {
    return { success: false, rowsUpserted: 0, error: 'Supabase client not initialized.' };
  }

  if (metricData.players.length === 0) {
    SyncLogger.info(`No players to sync for metric "${metricData.leaderboard_type}". Skipping.`);
    return { success: true, rowsUpserted: 0 };
  }

  const tableName = cfg.table || 'minecraft_leaderboards';
  const now = new Date().toISOString();

  const payloadRows = metricData.players.map(p => ({
    leaderboard_type: metricData.leaderboard_type,
    player_uuid: p.uuid || p.name,
    player_name: p.name,
    score: p.score,
    rank: p.rank,
    updated_at: now
  }));

  SyncLogger.info(`Upserting ${payloadRows.length} records into Supabase table "${tableName}" for "${metricData.leaderboard_type}"...`);

  try {
    // 1. Direct Table Upsert using Unique Constraint (leaderboard_type, player_uuid)
    const { error } = await client
      .from(tableName)
      .upsert(payloadRows, {
        onConflict: 'leaderboard_type,player_uuid'
      });

    if (error) {
      SyncLogger.warn(`Primary conflict upsert warning: ${error.message}. Trying fallback item-by-item...`);
      let successCount = 0;
      for (const row of payloadRows) {
        const { error: indErr } = await client.from(tableName).upsert([row]);
        if (!indErr) successCount++;
      }
      return { success: successCount > 0, rowsUpserted: successCount, error: error.message };
    }

    SyncLogger.info(`Successfully synchronized ${payloadRows.length} players for "${metricData.leaderboard_type}" to Supabase!`);
    return { success: true, rowsUpserted: payloadRows.length };
  } catch (err: any) {
    SyncLogger.error(`Supabase sync exception for "${metricData.leaderboard_type}": ${err.message}`);
    return { success: false, rowsUpserted: 0, error: err.message };
  }
}

export async function checkSupabaseHealth(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from(loadConfig().supabase.table || 'minecraft_leaderboards').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
