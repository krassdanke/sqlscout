# SQLScout

> Multi-dialect SQL command explorer and visual playground.

SQLScout turns SQL into an interactive execution-flow diagram — tables, CTEs,
joins, filters, aggregates, projections — and exposes a 13-dialect command
reference alongside the editor. It ships in three shapes:

- **Web playground** (`src/`): Vite + React + TypeScript single-page app.
- **Zed extension** (`zed-extension/`): language server + MCP context server +
  snippets + task template for first-class SQL editing inside Zed.
- **npm packages** (`packages/`): `@sqlscout/core` (parser + AST-to-flow +
  reference catalog), `@sqlscout/ls` (LSP), `@sqlscout/mcp` (MCP server).

## Status

`v0.2.0` — extension ships LSP + MCP surfaces. Web app `v0.1.0`.

## Repo layout

```
src/                React frontend (TypeScript) — web playground
packages/
  sqlscout-core/    Shared parser, dialects, AST-to-flow, command reference
  sqlscout-ls/      Node LSP — hover, code actions, diagnostics on SQL in code
  sqlscout-mcp/     Node MCP server — 4 tools exposed to Zed Agent panel
zed-extension/      Rust wasm extension wiring LSP + MCP + snippets + task
tests/e2e/          Spawned-process integration tests against LSP + MCP
design/             Static HTML preview of the design system
```

## Web playground - quickstart

```sh
npm install
npm run dev          # http://localhost:5273
npm run build        # static bundle in dist/
npm run typecheck    # tsc -b --noEmit
npm test             # unit + e2e
```

## Zed integration

Four inspection paths once the extension is installed (see
`zed-extension/README.md`):

| Surface       | What you do                                                   |
|---------------|---------------------------------------------------------------|
| **Hover**     | Cursor over SQL inside a TS/JS/Py/Rs/Go string → markdown summary + `Open in SQLScout` link. |
| **Code action** | `cmd-.` on a SQL literal → `Open in SQLScout`, `Extract to .sql file`. |
| **Task**      | `cmd-alt-s` (suggested bind) → opens current selection in the browser playground. |
| **Agent**     | Agent panel calls MCP tools `parse`, `playground_url`, `reference`, `list_topics`. |

Install for development:

```sh
cd zed-extension
cargo build --release --target wasm32-wasip1
# then in Zed: command palette → "zed: install dev extension" → pick this folder
```

Node 20+ is required on the user's machine. The first hover / agent call pulls
`@sqlscout/ls` / `@sqlscout/mcp` via `npx -y` (~5s cold start; cached after).

### Stack

- React 18 + TypeScript + Vite 5 (web app)
- Monaco Editor (via `@monaco-editor/react`) with a custom `sqlscout-dark` /
  `sqlscout-light` theme
- `node-sql-parser` for 13-dialect AST extraction
- Hand-rolled SVG flow renderer (no React Flow dependency yet)
- `vscode-languageserver` (LSP) + `@modelcontextprotocol/sdk` (MCP)

### Features

- **Multi-dialect parsing.** PostgreSQL, MySQL, MariaDB, SQLite, BigQuery,
  Snowflake, Redshift, Hive, Athena, Trino, SQL Server, Oracle, Teradata.
- **Live flow diagram.** Sources → CTEs → joins → filter → aggregate →
  projection → order/limit. Re-parses on a 250 ms debounce.
- **Command explorer.** Categorised SQL reference with per-dialect notes.
- **Heuristic perf score.** 0–100 with hints for SELECT *, missing WHERE,
  missing LIMIT, deep joins.
- **Samples panel.** Monthly revenue, top-N per group, recursive org chart,
  cohort retention.
- **In-editor diagnostics.** GROUP BY positional references flagged as fragile;
  parse errors surfaced inline.

### Design system

"Surveyor's Blueprint" — cartographic and technical. Hairline 1 px borders,
registration crosshairs at panel corners, fine dot grid background, mono caps
labels. One bold surveyor-orange accent on a deep-ink base. Fonts: Fraunces
(variable serif) for the wordmark and big numerals, DM Sans for UI, JetBrains
Mono for code and labels. See `design/preview.html`.

## Publishing the npm packages

```sh
npm run release:packages   # dry-run publish for all three workspace packages
```

## Roadmap

- [ ] Multi-statement tabs in the flow diagram.
- [ ] Column lineage edges (which input cols feed which output cols).
- [ ] PNG / SVG / Mermaid / DOT export.
- [ ] Tree-sitter grammar overrides for dialect-aware highlighting.
- [ ] Schema panel (manual `CREATE TABLE` → auto-inferred columns).
- [ ] Theme companion matching the SQLScout playground palette.

## License

MIT.
