use zed_extension_api::{
    self as zed, Result, SlashCommand, SlashCommandArgumentCompletion, SlashCommandOutput,
    SlashCommandOutputSection, Worktree,
};

const PLAYGROUND_BASE: &str = "https://sqlscout.app/";

struct SqlScout;

impl zed::Extension for SqlScout {
    fn new() -> Self {
        SqlScout
    }

    fn complete_slash_command_argument(
        &self,
        command: SlashCommand,
        _args: Vec<String>,
    ) -> Result<Vec<SlashCommandArgumentCompletion>> {
        match command.name.as_str() {
            "sqlscout-ref" => Ok(REFERENCE_TOPICS
                .iter()
                .map(|name| SlashCommandArgumentCompletion {
                    label: (*name).into(),
                    new_text: (*name).into(),
                    run_command: true,
                })
                .collect()),
            _ => Ok(Vec::new()),
        }
    }

    fn run_slash_command(
        &self,
        command: SlashCommand,
        args: Vec<String>,
        _worktree: Option<&Worktree>,
    ) -> Result<SlashCommandOutput> {
        match command.name.as_str() {
            "sqlscout" => playground_link(args),
            "sqlscout-ref" => reference_card(args),
            other => Err(format!("Unknown SQLScout command: {other}")),
        }
    }
}

fn playground_link(args: Vec<String>) -> Result<SlashCommandOutput> {
    let sql = args.join(" ");
    let trimmed = sql.trim();

    let url = if trimmed.is_empty() {
        PLAYGROUND_BASE.to_string()
    } else {
        format!("{PLAYGROUND_BASE}?q={}", percent_encode(trimmed))
    };

    let header = format!("Open in SQLScout -> {url}");
    let body = if trimmed.is_empty() {
        format!("{header}\n")
    } else {
        format!("{header}\n\n```sql\n{trimmed}\n```\n")
    };

    let header_end = header.len() as u32;
    Ok(SlashCommandOutput {
        sections: vec![SlashCommandOutputSection {
            range: (0..header_end).into(),
            label: "SQLScout link".into(),
        }],
        text: body,
    })
}

fn reference_card(args: Vec<String>) -> Result<SlashCommandOutput> {
    let topic = args.first().map(|s| s.to_lowercase()).unwrap_or_default();

    let entry = REFERENCE_BODY
        .iter()
        .find(|(name, _, _, _)| name.eq_ignore_ascii_case(&topic))
        .ok_or_else(|| {
            format!(
                "Unknown SQL topic: {topic}. Try one of: {}",
                REFERENCE_TOPICS.join(", ")
            )
        })?;

    let (name, syntax, summary, _cat) = entry;
    let header = format!("SQLScout - {name}");
    let body = format!("{header}\n\n{summary}\n\n```sql\n{syntax}\n```\n");
    let header_end = header.len() as u32;

    Ok(SlashCommandOutput {
        sections: vec![SlashCommandOutputSection {
            range: (0..header_end).into(),
            label: format!("SQLScout - {name}"),
        }],
        text: body,
    })
}

fn percent_encode(s: &str) -> String {
    let mut out = String::with_capacity(s.len() * 3);
    for byte in s.bytes() {
        let unreserved =
            byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~');
        if unreserved {
            out.push(byte as char);
        } else {
            out.push('%');
            out.push_str(&format!("{:02X}", byte));
        }
    }
    out
}

const REFERENCE_TOPICS: &[&str] = &[
    "select", "insert", "update", "delete", "merge",
    "inner-join", "left-join", "right-join", "full-join", "cross-join", "lateral",
    "with", "with-recursive",
    "over", "row-number", "rank", "lag-lead",
    "group-by", "having", "rollup", "cube",
    "create-table", "alter-table", "drop", "truncate", "create-index", "create-view",
    "begin", "commit", "rollback",
    "explain",
];

const REFERENCE_BODY: &[(&str, &str, &str, &str)] = &[
    ("SELECT",
     "SELECT [DISTINCT] <columns>\nFROM <table>\n[WHERE <predicate>]\n[GROUP BY ...]\n[HAVING ...]\n[ORDER BY ...]\n[LIMIT n];",
     "Project rows from one or more tables. SQL Server uses TOP n; Oracle uses FETCH FIRST n ROWS ONLY.",
     "DML"),
    ("INSERT",
     "INSERT INTO <table> (cols) VALUES (vals)\n  [ON CONFLICT (col) DO UPDATE SET ...];",
     "Add new rows. MySQL uses ON DUPLICATE KEY UPDATE; SQL Server / BigQuery use MERGE for upsert.",
     "DML"),
    ("UPDATE",
     "UPDATE <table> SET col = expr [, ...] WHERE <predicate>;",
     "Modify existing rows. Postgres supports UPDATE ... FROM other_table for joins.",
     "DML"),
    ("DELETE",
     "DELETE FROM <table> WHERE <predicate>;",
     "Remove rows. BigQuery requires a WHERE clause in standard SQL.",
     "DML"),
    ("MERGE",
     "MERGE INTO <target> USING <source> ON <cond>\n  WHEN MATCHED THEN UPDATE SET ...\n  WHEN NOT MATCHED THEN INSERT (...);",
     "Conditional upsert. Not available in MySQL / SQLite / MariaDB.",
     "DML"),
    ("INNER-JOIN",
     "a JOIN b ON a.id = b.a_id",
     "Rows matched on both sides of the join predicate.",
     "JOINS"),
    ("LEFT-JOIN",
     "a LEFT JOIN b ON a.id = b.a_id",
     "All rows from left side + matches; NULLs on right side when no match.",
     "JOINS"),
    ("RIGHT-JOIN",
     "a RIGHT JOIN b ON a.id = b.a_id",
     "Mirror of LEFT JOIN. Not supported in SQLite.",
     "JOINS"),
    ("FULL-JOIN",
     "a FULL OUTER JOIN b ON a.id = b.a_id",
     "Union of matched, left-only, right-only. MySQL/MariaDB don't support it natively.",
     "JOINS"),
    ("CROSS-JOIN",
     "a CROSS JOIN b",
     "Cartesian product of two relations.",
     "JOINS"),
    ("LATERAL",
     "a, LATERAL (SELECT ... FROM b WHERE b.x = a.x) sub",
     "Reference earlier FROM items inside a correlated subquery. Postgres, BigQuery, Snowflake.",
     "JOINS"),
    ("WITH",
     "WITH name AS ( <query> ) SELECT ... FROM name;",
     "Name a subquery and reuse it inside the surrounding SELECT.",
     "CTE"),
    ("WITH-RECURSIVE",
     "WITH RECURSIVE t AS (\n  <anchor>\n  UNION ALL\n  <step>\n)\nSELECT * FROM t;",
     "Self-referential CTE for tree / graph traversal. SQL Server omits the RECURSIVE keyword.",
     "CTE"),
    ("OVER",
     "<agg|win_fn> OVER ( [PARTITION BY ...] [ORDER BY ...] [<frame>] )",
     "Apply an aggregate or window function across a window of rows.",
     "WINDOW"),
    ("ROW-NUMBER",
     "ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)",
     "Unique sequential index per partition.",
     "WINDOW"),
    ("RANK",
     "RANK() OVER (PARTITION BY ... ORDER BY ...)",
     "Rank with gaps on ties. Use DENSE_RANK to avoid gaps.",
     "WINDOW"),
    ("LAG-LEAD",
     "LAG(col, n) OVER (PARTITION BY ... ORDER BY ...)",
     "Reference the previous (LAG) or next (LEAD) row inside a partition.",
     "WINDOW"),
    ("GROUP-BY",
     "SELECT k, agg(...) FROM t GROUP BY k;",
     "Collapse rows by key columns and aggregate the rest.",
     "AGG"),
    ("HAVING",
     "SELECT ... GROUP BY k HAVING agg(...) op v;",
     "Filter on aggregate results (vs WHERE which filters input rows).",
     "AGG"),
    ("ROLLUP",
     "GROUP BY ROLLUP (a, b)",
     "Hierarchical subtotals + grand total. Not in SQLite.",
     "AGG"),
    ("CUBE",
     "GROUP BY CUBE (a, b)",
     "All grouping permutations. Not in SQLite / MySQL / MariaDB.",
     "AGG"),
    ("CREATE-TABLE",
     "CREATE TABLE <name> ( <col> <type> [CONSTRAINT ...], ... );",
     "Define a new table. Autoincrement varies: SERIAL (Postgres), AUTO_INCREMENT (MySQL), INTEGER PK (SQLite).",
     "DDL"),
    ("ALTER-TABLE",
     "ALTER TABLE <name> ADD|DROP|RENAME|ALTER ...;",
     "Modify a table's structure.",
     "DDL"),
    ("DROP",
     "DROP TABLE [IF EXISTS] <name> [CASCADE];",
     "Remove a database object.",
     "DDL"),
    ("TRUNCATE",
     "TRUNCATE [TABLE] <name> [CASCADE];",
     "Fast row-wipe, non-logged where supported. Not in SQLite.",
     "DDL"),
    ("CREATE-INDEX",
     "CREATE [UNIQUE] INDEX <name> ON <table> (<cols>) [USING ...];",
     "Build a lookup index. BigQuery uses search indexes; no user-managed btree.",
     "DDL"),
    ("CREATE-VIEW",
     "CREATE [OR REPLACE] VIEW <name> AS <select>;",
     "Save a query as a named relation.",
     "DDL"),
    ("BEGIN",
     "BEGIN [TRANSACTION];",
     "Start a transaction.",
     "TXN"),
    ("COMMIT",
     "COMMIT;",
     "Persist the open transaction.",
     "TXN"),
    ("ROLLBACK",
     "ROLLBACK [TO SAVEPOINT s];",
     "Discard the open transaction.",
     "TXN"),
    ("EXPLAIN",
     "EXPLAIN [ANALYZE] <query>;",
     "Print the planner's execution plan. ANALYZE actually runs the query.",
     "UTIL"),
];

zed::register_extension!(SqlScout);
