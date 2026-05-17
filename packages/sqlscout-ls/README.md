# @sqlscout/ls

Language Server Protocol implementation that surfaces SQLScout features inside any LSP-capable editor.

## What it does

Detects SQL embedded inside source files and provides:

- **Hover**: parse summary (statement count, top-level clauses, tables) plus a one-click "Open in SQLScout" link.
- **Code actions**: "Open in SQLScout" (opens the playground at sqlscout.app) and "Extract to .sql file".
- **Diagnostics**: parse errors (Error) and a Hint when `GROUP BY` references a positional column number.

## Install

```sh
npm install -g @sqlscout/ls
# or
npx @sqlscout/ls
```

Then wire `sqlscout-ls` into your editor as an LSP server.

## Host languages

TypeScript / TSX, JavaScript / JSX (`sql\`...\`` tagged templates), Python (triple-quoted strings hinted by `# sql` or `sql`/`query` identifiers), Rust (`sqlx::query!`, `sqlx::query_as!`, SQL-shaped `format!`), Go (backtick raw strings starting with `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`WITH`), and plain `.sql` files.
