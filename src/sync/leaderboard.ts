import { executeReadOnlyQuery } from './mysql.js';
import { SyncLogger } from './logger.js';

export interface LeaderboardPlayerRecord {
  uuid: string;
  name: string;
  score: number;
  rank: number;
}

export interface MetricQueryResult {
  leaderboard_type: string;
  players: LeaderboardPlayerRecord[];
}

export async function fetchMetricLeaderboard(
  metric: string,
  tables: string[],
  batchSize = 100
): Promise<MetricQueryResult> {
  SyncLogger.info(`Fetching leaderboard data for metric: "${metric}" (limit: ${batchSize})`);

  let rawPlayers: Array<{ uuid?: string; username?: string; name?: string; value?: any }> = [];

  // Candidate table mappings for each metric
  const candidateMap: Record<string, string[]> = {
    kills: ['ajlb_statistic_player_kills', 'ajlb_statistic_kills', 'ajlb_kills', 'ajleaderboards_statistic_player_kills'],
    deaths: ['ajlb_statistic_deaths', 'ajlb_deaths', 'ajleaderboards_statistic_deaths'],
    playtime: ['ajlb_statistic_hours_played', 'ajlb_statistic_time_played', 'ajlb_statistic_play_one_minute', 'ajlb_hours', 'ajlb_playtime'],
    money: ['ajlb_vault_eco_balance_commas', 'ajlb_vault_eco_balance', 'ajlb_money', 'ajlb_balance'],
    balance: ['ajlb_vault_eco_balance_commas', 'ajlb_vault_eco_balance', 'ajlb_money', 'ajlb_balance'],
    blocks_broken: ['ajlb_statistic_mine_block', 'ajlb_statistic_blocks_broken', 'ajlb_blocks_broken'],
    mob_kills: ['ajlb_statistic_mob_kills', 'ajlb_mob_kills'],
    votes: ['ajlb_votes', 'ajlb_statistic_votes']
  };

  const metricLower = metric.toLowerCase();
  let candidateNames = candidateMap[metricLower] || [];

  // Also include any table that contains the metric name or ends with _metric
  const dynamicCandidates = tables.filter(t => {
    const l = t.toLowerCase();
    return l === `ajlb_${metricLower}` ||
           l === `ajleaderboards_${metricLower}` ||
           l.endsWith(`_${metricLower}`) ||
           (l.includes('statistic') && l.includes(metricLower));
  });

  candidateNames = Array.from(new Set([...candidateNames, ...dynamicCandidates]));

  // Find the first candidate table that exists in the database
  const targetTable = candidateNames.find(c => tables.some(t => t.toLowerCase() === c.toLowerCase()));

  const extrasTable = tables.find(t => {
    const l = t.toLowerCase();
    return (l.includes('extras') || l.includes('users') || l.includes('players')) && !l.startsWith('ajlb_statistic_');
  });

  if (targetTable) {
    try {
      const rawCols = await executeReadOnlyQuery(`SHOW COLUMNS FROM \`${targetTable}\``);
      const colNames = rawCols.map(c => String(c.Field).toLowerCase());
      
      const valCol = colNames.find(c => ['value', 'score', 'amount', 'stat', 'kills', 'balance', 'deaths'].includes(c)) || colNames[1] || 'value';
      const nameCol = colNames.find(c => ['namecache', 'displaynamecache', 'name', 'username', 'player', 'player_name'].includes(c));
      const uuidCol = colNames.find(c => ['id', 'uuid', 'player_uuid'].includes(c));

      // 1. Direct query on the table if it contains username/namecache directly
      if (nameCol) {
        const selectUuid = uuidCol ? `\`${uuidCol}\`` : `''`;
        const sql = `
          SELECT ${selectUuid} AS uuid, \`${nameCol}\` AS username, \`${valCol}\` AS value 
          FROM \`${targetTable}\` 
          WHERE \`${nameCol}\` IS NOT NULL AND \`${nameCol}\` != ''
          ORDER BY (\`${valCol}\` + 0) DESC LIMIT ${batchSize}
        `;
        rawPlayers = await executeReadOnlyQuery(sql);
      }

      // 2. If direct query yielded no rows and extrasTable exists with name column
      if (rawPlayers.length === 0 && extrasTable && uuidCol) {
        try {
          const extrasCols = await executeReadOnlyQuery(`SHOW COLUMNS FROM \`${extrasTable}\``);
          const eCols = extrasCols.map(c => String(c.Field).toLowerCase());
          const eNameCol = eCols.find(c => ['namecache', 'name', 'username', 'player_name', 'placeholder'].includes(c));
          const eIdCol = eCols.find(c => ['id', 'uuid', 'user_id'].includes(c)) || 'id';

          if (eNameCol) {
            const sql = `
              SELECT s.\`${uuidCol}\` AS uuid, e.\`${eNameCol}\` AS username, s.\`${valCol}\` AS value 
              FROM \`${targetTable}\` s 
              INNER JOIN \`${extrasTable}\` e ON s.\`${uuidCol}\` = e.\`${eIdCol}\` 
              ORDER BY (s.\`${valCol}\` + 0) DESC LIMIT ${batchSize}
            `;
            rawPlayers = await executeReadOnlyQuery(sql);
          }
        } catch (e) {
          // Ignore join failure
        }
      }
    } catch (err: any) {
      SyncLogger.warn(`Query for dedicated table "${targetTable}" failed: ${err.message}`);
    }
  }

  // Strategy 2: Search in unified data table (e.g. ajlb_data)
  if (rawPlayers.length === 0) {
    const unifiedTables = tables.filter(t => t.toLowerCase().includes('ajlb') || t.toLowerCase().includes('ajleaderboards'));
    for (const uTbl of unifiedTables) {
      try {
        const uColsRaw = await executeReadOnlyQuery(`SHOW COLUMNS FROM \`${uTbl}\``);
        const uCols = uColsRaw.map(c => String(c.Field).toLowerCase());
        const boardCol = uCols.find(c => ['board', 'type', 'stat', 'metric', 'category'].includes(c));
        const nameCol = uCols.find(c => ['namecache', 'name', 'username', 'player'].includes(c)) || 'name';
        const valCol = uCols.find(c => ['value', 'score', 'amount', 'stat'].includes(c)) || 'value';

        if (boardCol) {
          const sql = `
            SELECT '' AS uuid, \`${nameCol}\` AS username, \`${valCol}\` AS value 
            FROM \`${uTbl}\` 
            WHERE \`${boardCol}\` LIKE ? 
            ORDER BY (\`${valCol}\` + 0) DESC LIMIT ${batchSize}
          `;
          const rows = await executeReadOnlyQuery(sql, [`%${metric}%`]);
          if (rows.length > 0) {
            rawPlayers = rows;
            break;
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  // Data Sanitization & Deduplication
  const validPlayers = rawPlayers
    .map(p => {
      const name = String(p.username || p.name || '').trim();
      const rawVal = Number(p.value || 0);
      const uuid = String(p.uuid || name || 'player-uuid');
      return {
        uuid: uuid || name,
        name,
        score: isNaN(rawVal) ? 0 : Math.max(0, rawVal)
      };
    })
    .filter(p => p.name.length >= 2 && !p.name.includes('?'));

  // Keep highest score per username
  const map = new Map<string, { uuid: string; name: string; score: number }>();
  for (const p of validPlayers) {
    const existing = map.get(p.name);
    if (!existing || p.score > existing.score) {
      map.set(p.name, p);
    }
  }

  const sortedList = Array.from(map.values()).sort((a, b) => b.score - a.score);

  const formattedPlayers: LeaderboardPlayerRecord[] = sortedList.map((item, index) => ({
    uuid: item.uuid,
    name: item.name,
    score: item.score,
    rank: index + 1
  }));

  SyncLogger.info(`Verified ${formattedPlayers.length} top records for metric "${metric}".`);

  return {
    leaderboard_type: metric,
    players: formattedPlayers
  };
}
