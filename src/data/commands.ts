import type { DialectId } from '../lib/dialects';

export type CommandCategory =
  | 'DML'
  | 'DDL'
  | 'JOINS'
  | 'CTE'
  | 'WINDOW'
  | 'AGG'
  | 'TXN'
  | 'UTIL';

export interface SqlCommand {
  id: string;
  name: string;
  category: CommandCategory;
  /** Short one-line description. */
  summary: string;
  /** Generic SQL syntax skeleton. */
  syntax: string;
  /** Per-dialect notes; missing = supported as written. */
  notes?: Partial<Record<DialectId, string>>;
  /** Dialects that *do not* support this command. */
  unsupported?: DialectId[];
  /** Tiny one-statement example for the docs panel. */
  example: string;
}

export const CATEGORIES: { id: CommandCategory; label: string }[] = [
  { id: 'DML',    label: 'Data Manipulation' },
  { id: 'JOINS',  label: 'Joins' },
  { id: 'CTE',    label: 'CTE & Recursion' },
  { id: 'WINDOW', label: 'Window Functions' },
  { id: 'AGG',    label: 'Aggregation' },
  { id: 'DDL',    label: 'Data Definition' },
  { id: 'TXN',    label: 'Transactions' },
  { id: 'UTIL',   label: 'Utility' },
];

export const COMMANDS: SqlCommand[] = [
  // ---- DML ----
  {
    id: 'select', name: 'SELECT', category: 'DML',
    summary: 'Project rows from one or more tables.',
    syntax: 'SELECT [DISTINCT] <columns>\nFROM <table>\n[WHERE <predicate>]\n[GROUP BY ...]\n[HAVING ...]\n[ORDER BY ...]\n[LIMIT n]',
    example: 'SELECT id, email FROM users WHERE active = true LIMIT 10;',
    notes: {
      sqlserver: 'Use TOP n instead of LIMIT n.',
      oracle: 'Use FETCH FIRST n ROWS ONLY.',
    },
  },
  {
    id: 'insert', name: 'INSERT', category: 'DML',
    summary: 'Add new rows to a table.',
    syntax: 'INSERT INTO <table> (cols...) VALUES (vals...)\n  [ON CONFLICT (col) DO UPDATE SET ...]',
    example: "INSERT INTO users (email) VALUES ('a@b.com');",
    notes: {
      mysql: 'Use ON DUPLICATE KEY UPDATE instead of ON CONFLICT.',
      sqlserver: 'No ON CONFLICT — use MERGE.',
      bigquery: 'No upsert; use MERGE.',
    },
  },
  {
    id: 'update', name: 'UPDATE', category: 'DML',
    summary: 'Modify existing rows.',
    syntax: 'UPDATE <table> SET col = expr [, ...] WHERE <predicate>',
    example: "UPDATE users SET tier = 'pro' WHERE id = 42;",
    notes: {
      mysql: 'UPDATE supports JOIN syntax: UPDATE a JOIN b ON ...',
      postgresql: 'Use UPDATE ... FROM other_table for joins.',
    },
  },
  {
    id: 'delete', name: 'DELETE', category: 'DML',
    summary: 'Remove rows from a table.',
    syntax: 'DELETE FROM <table> WHERE <predicate>',
    example: 'DELETE FROM sessions WHERE expires_at < NOW();',
    notes: {
      bigquery: 'Requires a WHERE clause in standard SQL.',
    },
  },
  {
    id: 'merge', name: 'MERGE', category: 'DML',
    summary: 'Conditional upsert from a source set.',
    syntax: 'MERGE INTO <target> USING <source> ON <cond>\n  WHEN MATCHED THEN UPDATE SET ...\n  WHEN NOT MATCHED THEN INSERT (...)',
    example: 'MERGE INTO dim_user d USING staging s ON d.id = s.id WHEN MATCHED THEN UPDATE SET name = s.name;',
    unsupported: ['mysql', 'sqlite', 'mariadb'],
  },

  // ---- JOINS ----
  {
    id: 'inner-join', name: 'INNER JOIN', category: 'JOINS',
    summary: 'Rows matched on both sides.',
    syntax: 'a JOIN b ON a.id = b.a_id',
    example: 'SELECT * FROM users u JOIN orders o ON o.user_id = u.id;',
  },
  {
    id: 'left-join', name: 'LEFT JOIN', category: 'JOINS',
    summary: 'All left rows + matches; NULL on right when absent.',
    syntax: 'a LEFT JOIN b ON a.id = b.a_id',
    example: 'SELECT u.id, COUNT(o.id) FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id;',
  },
  {
    id: 'right-join', name: 'RIGHT JOIN', category: 'JOINS',
    summary: 'Mirror of LEFT JOIN.',
    syntax: 'a RIGHT JOIN b ON a.id = b.a_id',
    example: 'SELECT * FROM a RIGHT JOIN b ON a.id = b.a_id;',
    unsupported: ['sqlite'],
  },
  {
    id: 'full-join', name: 'FULL OUTER JOIN', category: 'JOINS',
    summary: 'Union of matched, left-only, right-only.',
    syntax: 'a FULL OUTER JOIN b ON a.id = b.a_id',
    example: 'SELECT * FROM a FULL OUTER JOIN b ON a.id = b.a_id;',
    unsupported: ['mysql', 'mariadb'],
    notes: { mysql: 'Emulate via UNION of LEFT and RIGHT joins.' },
  },
  {
    id: 'cross-join', name: 'CROSS JOIN', category: 'JOINS',
    summary: 'Cartesian product of two sets.',
    syntax: 'a CROSS JOIN b',
    example: 'SELECT * FROM colors CROSS JOIN sizes;',
  },
  {
    id: 'lateral', name: 'LATERAL', category: 'JOINS',
    summary: 'Reference earlier FROM items inside a subquery.',
    syntax: 'a, LATERAL (SELECT ... FROM b WHERE b.x = a.x) sub',
    example: 'SELECT u.id, top.* FROM users u, LATERAL (SELECT * FROM orders o WHERE o.user_id = u.id ORDER BY total DESC LIMIT 1) top;',
    unsupported: ['sqlite', 'sqlserver'],
  },

  // ---- CTE ----
  {
    id: 'with', name: 'WITH', category: 'CTE',
    summary: 'Name a subquery to reuse it.',
    syntax: 'WITH name AS ( <query> ) SELECT ... FROM name',
    example: 'WITH paid AS (SELECT * FROM orders WHERE paid_at IS NOT NULL) SELECT COUNT(*) FROM paid;',
  },
  {
    id: 'with-recursive', name: 'WITH RECURSIVE', category: 'CTE',
    summary: 'Self-referential CTE for trees/graphs.',
    syntax: 'WITH RECURSIVE t AS ( <anchor> UNION ALL <step> ) SELECT * FROM t',
    example: 'WITH RECURSIVE tree AS (SELECT id, parent_id FROM nodes WHERE parent_id IS NULL UNION ALL SELECT n.id, n.parent_id FROM nodes n JOIN tree t ON t.id = n.parent_id) SELECT * FROM tree;',
    notes: {
      sqlserver: 'No RECURSIVE keyword — recursion is implicit.',
    },
  },

  // ---- WINDOW ----
  {
    id: 'over', name: 'OVER ()', category: 'WINDOW',
    summary: 'Apply an aggregate over a window of rows.',
    syntax: '<agg|win_fn> OVER ( [PARTITION BY ...] [ORDER BY ...] [frame] )',
    example: 'SELECT id, SUM(amount) OVER (PARTITION BY user_id) AS user_total FROM payments;',
  },
  {
    id: 'row-number', name: 'ROW_NUMBER ()', category: 'WINDOW',
    summary: 'Unique sequential index per partition.',
    syntax: 'ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)',
    example: 'SELECT *, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn FROM products;',
  },
  {
    id: 'rank', name: 'RANK ()', category: 'WINDOW',
    summary: 'Rank with gaps on ties.',
    syntax: 'RANK() OVER (PARTITION BY ... ORDER BY ...)',
    example: 'SELECT *, RANK() OVER (ORDER BY score DESC) AS r FROM leaderboard;',
  },
  {
    id: 'dense-rank', name: 'DENSE_RANK ()', category: 'WINDOW',
    summary: 'Rank without gaps on ties.',
    syntax: 'DENSE_RANK() OVER (PARTITION BY ... ORDER BY ...)',
    example: 'SELECT *, DENSE_RANK() OVER (ORDER BY score DESC) FROM leaderboard;',
  },
  {
    id: 'lag-lead', name: 'LAG / LEAD', category: 'WINDOW',
    summary: 'Reference previous / next row inside a partition.',
    syntax: 'LAG(col, n) OVER (PARTITION BY ... ORDER BY ...)',
    example: 'SELECT id, ts, LAG(value) OVER (ORDER BY ts) AS prev FROM readings;',
  },

  // ---- AGG ----
  {
    id: 'group-by', name: 'GROUP BY', category: 'AGG',
    summary: 'Collapse rows by key columns.',
    syntax: 'SELECT k, agg(...) FROM t GROUP BY k',
    example: 'SELECT user_id, COUNT(*) FROM events GROUP BY user_id;',
  },
  {
    id: 'having', name: 'HAVING', category: 'AGG',
    summary: 'Filter on aggregate result.',
    syntax: 'SELECT ... GROUP BY k HAVING agg(...) op v',
    example: 'SELECT user_id, COUNT(*) c FROM events GROUP BY user_id HAVING COUNT(*) > 100;',
  },
  {
    id: 'rollup', name: 'GROUP BY ROLLUP', category: 'AGG',
    summary: 'Hierarchical subtotals + grand total.',
    syntax: 'GROUP BY ROLLUP (a, b)',
    example: 'SELECT region, product, SUM(amount) FROM sales GROUP BY ROLLUP (region, product);',
    unsupported: ['sqlite'],
  },
  {
    id: 'cube', name: 'GROUP BY CUBE', category: 'AGG',
    summary: 'All grouping permutations.',
    syntax: 'GROUP BY CUBE (a, b)',
    example: 'SELECT a, b, COUNT(*) FROM t GROUP BY CUBE (a, b);',
    unsupported: ['sqlite', 'mysql', 'mariadb'],
  },

  // ---- DDL ----
  {
    id: 'create-table', name: 'CREATE TABLE', category: 'DDL',
    summary: 'Define a new table.',
    syntax: 'CREATE TABLE <name> ( <col> <type> [CONSTRAINT ...], ... )',
    example: 'CREATE TABLE users (id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE);',
    notes: {
      mysql: 'AUTO_INCREMENT instead of SERIAL/IDENTITY.',
      sqlite: 'INTEGER PRIMARY KEY auto-increments.',
      bigquery: 'No primary keys enforced; only metadata.',
    },
  },
  {
    id: 'alter-table', name: 'ALTER TABLE', category: 'DDL',
    summary: 'Modify table structure.',
    syntax: 'ALTER TABLE <name> ADD|DROP|RENAME|ALTER ...',
    example: 'ALTER TABLE users ADD COLUMN signup_source TEXT;',
  },
  {
    id: 'drop', name: 'DROP', category: 'DDL',
    summary: 'Remove a database object.',
    syntax: 'DROP TABLE [IF EXISTS] <name> [CASCADE]',
    example: 'DROP TABLE IF EXISTS staging_orders;',
  },
  {
    id: 'truncate', name: 'TRUNCATE', category: 'DDL',
    summary: 'Delete every row, fast, non-logged where supported.',
    syntax: 'TRUNCATE [TABLE] <name> [CASCADE]',
    example: 'TRUNCATE TABLE staging_orders;',
    unsupported: ['sqlite'],
  },
  {
    id: 'create-index', name: 'CREATE INDEX', category: 'DDL',
    summary: 'Build a lookup index on one or more columns.',
    syntax: 'CREATE [UNIQUE] INDEX <name> ON <table> (<cols>) [USING ...]',
    example: 'CREATE INDEX idx_users_email ON users (email);',
    notes: { bigquery: 'No user-managed indexes; uses search indexes instead.' },
  },
  {
    id: 'create-view', name: 'CREATE VIEW', category: 'DDL',
    summary: 'Save a query as a named relation.',
    syntax: 'CREATE [OR REPLACE] VIEW <name> AS <select>',
    example: 'CREATE VIEW active_users AS SELECT * FROM users WHERE active;',
  },

  // ---- TXN ----
  {
    id: 'begin', name: 'BEGIN', category: 'TXN',
    summary: 'Start a transaction.',
    syntax: 'BEGIN [TRANSACTION]',
    example: 'BEGIN; UPDATE accounts SET bal = bal - 10 WHERE id = 1; COMMIT;',
  },
  {
    id: 'commit', name: 'COMMIT', category: 'TXN',
    summary: 'Persist the open transaction.',
    syntax: 'COMMIT',
    example: 'COMMIT;',
  },
  {
    id: 'rollback', name: 'ROLLBACK', category: 'TXN',
    summary: 'Discard the open transaction.',
    syntax: 'ROLLBACK [TO SAVEPOINT s]',
    example: 'ROLLBACK;',
  },

  // ---- UTIL ----
  {
    id: 'explain', name: 'EXPLAIN', category: 'UTIL',
    summary: 'Print the query plan.',
    syntax: 'EXPLAIN [ANALYZE] <query>',
    example: 'EXPLAIN ANALYZE SELECT * FROM users WHERE email = $1;',
  },
  {
    id: 'with-data', name: 'VALUES', category: 'UTIL',
    summary: 'Inline row literal set.',
    syntax: 'VALUES (...), (...), ...',
    example: "SELECT * FROM (VALUES (1, 'a'), (2, 'b')) AS t(id, label);",
  },
];

export const COMMANDS_BY_CATEGORY: Record<CommandCategory, SqlCommand[]> =
  CATEGORIES.reduce((acc, c) => {
    acc[c.id] = COMMANDS.filter(cmd => cmd.category === c.id);
    return acc;
  }, {} as Record<CommandCategory, SqlCommand[]>);
