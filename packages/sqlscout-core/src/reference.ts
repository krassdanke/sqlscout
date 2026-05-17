export type ReferenceCategory =
  | 'DML'
  | 'JOINS'
  | 'CTE'
  | 'WINDOW'
  | 'AGG'
  | 'DDL'
  | 'TXN'
  | 'UTIL';

export interface ReferenceEntry {
  slug: string;
  name: string;
  syntax: string;
  summary: string;
  category: ReferenceCategory;
}

export const REFERENCE: ReadonlyArray<ReferenceEntry> = [
  {
    slug: 'select',
    name: 'SELECT',
    syntax:
      'SELECT [DISTINCT] <columns>\nFROM <table>\n[WHERE <predicate>]\n[GROUP BY ...]\n[HAVING ...]\n[ORDER BY ...]\n[LIMIT n];',
    summary:
      'Project rows from one or more tables. SQL Server uses TOP n; Oracle uses FETCH FIRST n ROWS ONLY.',
    category: 'DML',
  },
  {
    slug: 'insert',
    name: 'INSERT',
    syntax:
      'INSERT INTO <table> (cols) VALUES (vals)\n  [ON CONFLICT (col) DO UPDATE SET ...];',
    summary:
      'Add new rows. MySQL uses ON DUPLICATE KEY UPDATE; SQL Server / BigQuery use MERGE for upsert.',
    category: 'DML',
  },
  {
    slug: 'update',
    name: 'UPDATE',
    syntax: 'UPDATE <table> SET col = expr [, ...] WHERE <predicate>;',
    summary:
      'Modify existing rows. Postgres supports UPDATE ... FROM other_table for joins.',
    category: 'DML',
  },
  {
    slug: 'delete',
    name: 'DELETE',
    syntax: 'DELETE FROM <table> WHERE <predicate>;',
    summary: 'Remove rows. BigQuery requires a WHERE clause in standard SQL.',
    category: 'DML',
  },
  {
    slug: 'merge',
    name: 'MERGE',
    syntax:
      'MERGE INTO <target> USING <source> ON <cond>\n  WHEN MATCHED THEN UPDATE SET ...\n  WHEN NOT MATCHED THEN INSERT (...);',
    summary: 'Conditional upsert. Not available in MySQL / SQLite / MariaDB.',
    category: 'DML',
  },
  {
    slug: 'inner-join',
    name: 'INNER JOIN',
    syntax: 'a JOIN b ON a.id = b.a_id',
    summary: 'Rows matched on both sides of the join predicate.',
    category: 'JOINS',
  },
  {
    slug: 'left-join',
    name: 'LEFT JOIN',
    syntax: 'a LEFT JOIN b ON a.id = b.a_id',
    summary:
      'All rows from left side + matches; NULLs on right side when no match.',
    category: 'JOINS',
  },
  {
    slug: 'right-join',
    name: 'RIGHT JOIN',
    syntax: 'a RIGHT JOIN b ON a.id = b.a_id',
    summary: 'Mirror of LEFT JOIN. Not supported in SQLite.',
    category: 'JOINS',
  },
  {
    slug: 'full-join',
    name: 'FULL JOIN',
    syntax: 'a FULL OUTER JOIN b ON a.id = b.a_id',
    summary:
      "Union of matched, left-only, right-only. MySQL/MariaDB don't support it natively.",
    category: 'JOINS',
  },
  {
    slug: 'cross-join',
    name: 'CROSS JOIN',
    syntax: 'a CROSS JOIN b',
    summary: 'Cartesian product of two relations.',
    category: 'JOINS',
  },
  {
    slug: 'lateral',
    name: 'LATERAL',
    syntax: 'a, LATERAL (SELECT ... FROM b WHERE b.x = a.x) sub',
    summary:
      'Reference earlier FROM items inside a correlated subquery. Postgres, BigQuery, Snowflake.',
    category: 'JOINS',
  },
  {
    slug: 'with',
    name: 'WITH',
    syntax: 'WITH name AS ( <query> ) SELECT ... FROM name;',
    summary: 'Name a subquery and reuse it inside the surrounding SELECT.',
    category: 'CTE',
  },
  {
    slug: 'with-recursive',
    name: 'WITH RECURSIVE',
    syntax:
      'WITH RECURSIVE t AS (\n  <anchor>\n  UNION ALL\n  <step>\n)\nSELECT * FROM t;',
    summary:
      'Self-referential CTE for tree / graph traversal. SQL Server omits the RECURSIVE keyword.',
    category: 'CTE',
  },
  {
    slug: 'over',
    name: 'OVER',
    syntax:
      '<agg|win_fn> OVER ( [PARTITION BY ...] [ORDER BY ...] [<frame>] )',
    summary: 'Apply an aggregate or window function across a window of rows.',
    category: 'WINDOW',
  },
  {
    slug: 'row-number',
    name: 'ROW_NUMBER',
    syntax: 'ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)',
    summary: 'Unique sequential index per partition.',
    category: 'WINDOW',
  },
  {
    slug: 'rank',
    name: 'RANK',
    syntax: 'RANK() OVER (PARTITION BY ... ORDER BY ...)',
    summary: 'Rank with gaps on ties. Use DENSE_RANK to avoid gaps.',
    category: 'WINDOW',
  },
  {
    slug: 'lag-lead',
    name: 'LAG / LEAD',
    syntax: 'LAG(col, n) OVER (PARTITION BY ... ORDER BY ...)',
    summary:
      'Reference the previous (LAG) or next (LEAD) row inside a partition.',
    category: 'WINDOW',
  },
  {
    slug: 'group-by',
    name: 'GROUP BY',
    syntax: 'SELECT k, agg(...) FROM t GROUP BY k;',
    summary: 'Collapse rows by key columns and aggregate the rest.',
    category: 'AGG',
  },
  {
    slug: 'having',
    name: 'HAVING',
    syntax: 'SELECT ... GROUP BY k HAVING agg(...) op v;',
    summary:
      'Filter on aggregate results (vs WHERE which filters input rows).',
    category: 'AGG',
  },
  {
    slug: 'rollup',
    name: 'ROLLUP',
    syntax: 'GROUP BY ROLLUP (a, b)',
    summary: 'Hierarchical subtotals + grand total. Not in SQLite.',
    category: 'AGG',
  },
  {
    slug: 'cube',
    name: 'CUBE',
    syntax: 'GROUP BY CUBE (a, b)',
    summary: 'All grouping permutations. Not in SQLite / MySQL / MariaDB.',
    category: 'AGG',
  },
  {
    slug: 'create-table',
    name: 'CREATE TABLE',
    syntax:
      'CREATE TABLE <name> ( <col> <type> [CONSTRAINT ...], ... );',
    summary:
      'Define a new table. Autoincrement varies: SERIAL (Postgres), AUTO_INCREMENT (MySQL), INTEGER PK (SQLite).',
    category: 'DDL',
  },
  {
    slug: 'alter-table',
    name: 'ALTER TABLE',
    syntax: 'ALTER TABLE <name> ADD|DROP|RENAME|ALTER ...;',
    summary: "Modify a table's structure.",
    category: 'DDL',
  },
  {
    slug: 'drop',
    name: 'DROP',
    syntax: 'DROP TABLE [IF EXISTS] <name> [CASCADE];',
    summary: 'Remove a database object.',
    category: 'DDL',
  },
  {
    slug: 'truncate',
    name: 'TRUNCATE',
    syntax: 'TRUNCATE [TABLE] <name> [CASCADE];',
    summary: 'Fast row-wipe, non-logged where supported. Not in SQLite.',
    category: 'DDL',
  },
  {
    slug: 'create-index',
    name: 'CREATE INDEX',
    syntax:
      'CREATE [UNIQUE] INDEX <name> ON <table> (<cols>) [USING ...];',
    summary:
      'Build a lookup index. BigQuery uses search indexes; no user-managed btree.',
    category: 'DDL',
  },
  {
    slug: 'create-view',
    name: 'CREATE VIEW',
    syntax: 'CREATE [OR REPLACE] VIEW <name> AS <select>;',
    summary: 'Save a query as a named relation.',
    category: 'DDL',
  },
  {
    slug: 'begin',
    name: 'BEGIN',
    syntax: 'BEGIN [TRANSACTION];',
    summary: 'Start a transaction.',
    category: 'TXN',
  },
  {
    slug: 'commit',
    name: 'COMMIT',
    syntax: 'COMMIT;',
    summary: 'Persist the open transaction.',
    category: 'TXN',
  },
  {
    slug: 'rollback',
    name: 'ROLLBACK',
    syntax: 'ROLLBACK [TO SAVEPOINT s];',
    summary: 'Discard the open transaction.',
    category: 'TXN',
  },
  {
    slug: 'explain',
    name: 'EXPLAIN',
    syntax: 'EXPLAIN [ANALYZE] <query>;',
    summary:
      "Print the planner's execution plan. ANALYZE actually runs the query.",
    category: 'UTIL',
  },
];

export const REFERENCE_BY_SLUG: Record<string, ReferenceEntry> =
  Object.fromEntries(REFERENCE.map((entry) => [entry.slug, entry]));

export function findReference(query: string): ReferenceEntry | undefined {
  const needle = query.trim().toLowerCase();
  return REFERENCE_BY_SLUG[needle];
}

export function fuzzyReferenceMatches(
  query: string,
  limit = 3,
): ReferenceEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return REFERENCE.filter(
    (entry) =>
      entry.slug.includes(needle) ||
      entry.name.toLowerCase().includes(needle) ||
      entry.summary.toLowerCase().includes(needle),
  ).slice(0, limit);
}
