export type DialectId =
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'sqlite'
  | 'bigquery'
  | 'snowflake'
  | 'redshift'
  | 'hive'
  | 'athena'
  | 'trino'
  | 'sqlserver'
  | 'oracle'
  | 'teradata';

export interface Dialect {
  id: DialectId;
  label: string;
  version: string;
  /** node-sql-parser `database` option mapping. Missing dialects fall back to a close cousin. */
  parserDb: string;
  notes?: string;
}

export const DIALECTS: Dialect[] = [
  { id: 'postgresql', label: 'PostgreSQL', version: '16.x', parserDb: 'PostgresQL' },
  { id: 'mysql',      label: 'MySQL',      version: '8.x',  parserDb: 'MySQL' },
  { id: 'mariadb',    label: 'MariaDB',    version: '11.x', parserDb: 'MariaDB' },
  { id: 'sqlite',     label: 'SQLite',     version: '3.x',  parserDb: 'Sqlite' },
  { id: 'bigquery',   label: 'BigQuery',   version: 'std',  parserDb: 'BigQuery' },
  { id: 'snowflake',  label: 'Snowflake',  version: '—',    parserDb: 'Snowflake' },
  { id: 'redshift',   label: 'Redshift',   version: '—',    parserDb: 'Redshift' },
  { id: 'hive',       label: 'Hive',       version: '3.x',  parserDb: 'Hive' },
  { id: 'athena',     label: 'Athena',     version: '3.x',  parserDb: 'Athena' },
  { id: 'trino',      label: 'Trino',      version: '—',    parserDb: 'Trino' },
  { id: 'sqlserver',  label: 'SQL Server', version: '2022', parserDb: 'TransactSQL' },
  { id: 'oracle',     label: 'Oracle',     version: '23ai', parserDb: 'PostgresQL', notes: 'Parsed as PostgreSQL — partial coverage' },
  { id: 'teradata',   label: 'Teradata',   version: '—',    parserDb: 'PostgresQL', notes: 'Parsed as PostgreSQL — partial coverage' },
];

export const DIALECT_BY_ID = Object.fromEntries(
  DIALECTS.map(d => [d.id, d]),
) as Record<DialectId, Dialect>;
