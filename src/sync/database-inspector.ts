import { executeReadOnlyQuery, checkMySQLHealth } from './mysql.js';
import { SyncLogger } from './logger.js';

export interface TableInspectionResult {
  tableName: string;
  columns: Array<{
    field: string;
    type: string;
    null: string;
    key: string;
    default: any;
    extra: string;
  }>;
  indexes: Array<{
    keyName: string;
    columnName: string;
    nonUnique: number;
  }>;
  rowCount: number;
  sampleRows: any[];
}

export async function inspectDatabase(): Promise<TableInspectionResult[]> {
  const isHealthy = await checkMySQLHealth();
  if (!isHealthy) {
    SyncLogger.error('Cannot inspect database: MySQL connection is unreachable.');
    return [];
  }

  SyncLogger.info('====================================================');
  SyncLogger.info('      INSPECTING MYSQL DATABASE SCHEMA               ');
  SyncLogger.info('====================================================');

  const rawTables = await executeReadOnlyQuery('SHOW TABLES');
  const tableNames = rawTables
    .map(r => (r ? String(Object.values(r)[0] || '') : ''))
    .filter(Boolean);

  SyncLogger.info(`Discovered ${tableNames.length} total tables in database.`);

  const inspections: TableInspectionResult[] = [];

  for (const tableName of tableNames) {
    try {
      const rawCols = await executeReadOnlyQuery(`SHOW COLUMNS FROM \`${tableName}\``);
      const cols = rawCols.map(c => ({
        field: String(c.Field),
        type: String(c.Type),
        null: String(c.Null),
        key: String(c.Key),
        default: c.Default,
        extra: String(c.Extra)
      }));

      const rawIdx = await executeReadOnlyQuery(`SHOW INDEX FROM \`${tableName}\``);
      const indexes = rawIdx.map(i => ({
        keyName: String(i.Key_name),
        columnName: String(i.Column_name),
        nonUnique: Number(i.Non_unique)
      }));

      const countRes = await executeReadOnlyQuery(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      const rowCount = countRes[0]?.cnt ? Number(countRes[0].cnt) : 0;

      const sampleRows = await executeReadOnlyQuery(`SELECT * FROM \`${tableName}\` LIMIT 3`);

      inspections.push({
        tableName,
        columns: cols,
        indexes,
        rowCount,
        sampleRows
      });
    } catch (err: any) {
      SyncLogger.warn(`Could not inspect table "${tableName}": ${err.message}`);
    }
  }

  return inspections;
}

export async function inspectAjlbReport(): Promise<string> {
  const allTables = await inspectDatabase();
  const ajlbTables = allTables.filter(t => 
    t.tableName.toLowerCase().includes('ajlb') || 
    t.tableName.toLowerCase().includes('ajleaderboards') ||
    t.tableName.toLowerCase().includes('extras')
  );

  let report = '\n====================================================\n';
  report += '       AJLEADERBOARDS DATABASE INSPECTION REPORT     \n';
  report += '====================================================\n\n';

  if (ajlbTables.length === 0) {
    report += '⚠️ No tables matching "ajlb_%" or "ajleaderboards_%" found.\n';
    report += `All discovered tables (${allTables.length}): ${allTables.map(t => t.tableName).join(', ')}\n`;
  } else {
    report += `Found ${ajlbTables.length} ajLeaderboards tables:\n\n`;

    for (const t of ajlbTables) {
      report += `----------------------------------------------------\n`;
      report += `Table: ${t.tableName} (Rows: ${t.rowCount})\n`;
      report += `----------------------------------------------------\n`;
      report += `Columns:\n`;
      for (const col of t.columns) {
        const pk = col.key === 'PRI' ? ' [PRIMARY KEY]' : '';
        report += `  - ${col.field} (${col.type})${pk}\n`;
      }

      if (t.indexes.length > 0) {
        report += `\nIndexes:\n`;
        for (const idx of t.indexes) {
          report += `  - Key: ${idx.keyName} -> Column: ${idx.columnName}\n`;
        }
      }

      if (t.sampleRows.length > 0) {
        report += `\nSample Data (First ${t.sampleRows.length} rows):\n`;
        report += JSON.stringify(t.sampleRows, null, 2) + '\n';
      }
      report += '\n';
    }
  }

  return report;
}
