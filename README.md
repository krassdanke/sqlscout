# SQLScout

> Multi-dialect SQL command explorer and visual playground.

SQLScout turns SQL into an interactive execution-flow diagram — tables, CTEs,
joins, filters, aggregates, projections — and exposes a 13-dialect command
reference alongside the editor. It ships in two shapes:

- **Web playground** (this repo): Vite + React + TypeScript single-page app.
- **Zed extension** (`zed-extension/`): slash commands and snippet pack that
  bring the playground and the command catalog into the Zed editor.

## Status

`v0.1.0` — prototype. Parses SELECT-shaped statements end-to-end and renders
a vertical flow graph. The catalog covers DML, DDL, joins, CTEs, window
functions, aggregation, transactions, and utilities.

## Repo layout

```
src/                React frontend (TypeScript)
  components/       Top bar, command explorer, editor, flow diagram, status bar
  lib/              Dialect catalog, samples, parser wrapper, AST -> flow
  data/             SQL command reference (per-dialect notes + examples)
  styles/           tokens.css + app.css (Surveyor's Blueprint design system)
design/             Static HTML preview of the design system
zed-extension/      Rust crate + extension.toml + snippets/sql.json
```

## Web playground - quickstart

```sh
npm install
npm run dev          # http://localhost:5273
npm run build        # static bundle in dist/
npm run typecheck    # tsc -b --noEmit
```

### Stack

- React 18 + TypeScript + Vite 5
- Monaco Editor (via `@monaco-editor/react`) with a custom `sqlscout-dark` /
  `sqlscout-light` theme
- `node-sql-parser` for 13-dialect AST extraction
- Hand-rolled SVG flow renderer (no React Flow dependency yet — kept light
  so the prototype boots fast)

### Features

- **Multi-dialect parsing.** PostgreSQL, MySQL, MariaDB, SQLite, BigQuery,
  Snowflake, Redshift, Hive, Athena, Trino, SQL Server, Oracle, Teradata.
  (Oracle and Teradata currently fall back to the PostgreSQL grammar.)
- **Live flow diagram.** Sources -> CTEs -> joins -> filter -> aggregate ->
  projection -> order/limit. Re-parses on a 250 ms debounce.
- **Command explorer.** Categorised SQL reference with per-dialect notes
  (e.g. "MySQL: emulate FULL OUTER JOIN via UNION of LEFT and RIGHT").
- **Heuristic perf score.** 0-100 with hints for SELECT *, missing WHERE,
  missing LIMIT, deep joins.
- **Samples panel.** Monthly revenue, top-N per group, recursive org chart,
  cohort retention.
- **Export.** Flow as JSON. Future: PNG / SVG / Mermaid / DOT.
- **Dark + light.** Both themes share the same blueprint aesthetic.

### Design system

The visual language is "Surveyor's Blueprint" — cartographic and technical.
Hairline 1 px borders, registration crosshairs at panel corners, fine dot
grid background, mono caps labels. One bold surveyor-orange accent on a
deep-ink base. Fonts: Fraunces (variable serif) for the wordmark and big
numerals, DM Sans for UI, JetBrains Mono for code and labels.

Open `design/preview.html` in a browser for a static visual diff.

## Zed extension - quickstart

```sh
cd zed-extension
cargo build --release --target wasm32-wasip1
# then in Zed: command palette -> "zed: install dev extension" -> select this folder
```

Once installed:

- `/sqlscout SELECT * FROM users` -> playground URL with query prefilled.
- `/sqlscout-ref left-join` -> reference card inserted into the assistant.
- Snippet prefixes `ssel`, `scte`, `srn`, `sjoin`, `supsert`, `sexplain`, ...

See `zed-extension/README.md` for the full surface.

## Roadmap

- [ ] Multi-statement tabs in the flow diagram.
- [ ] Column lineage edges (which input cols feed which output cols).
- [ ] PNG / SVG / Mermaid / DOT export.
- [ ] `sqlscout-ls` language server -> in-editor diagnostics + inline flow.
- [ ] Tree-sitter grammar overrides for dialect-aware highlighting.
- [ ] Schema panel (manual `CREATE TABLE` -> auto-inferred columns).

## License

MIT.
