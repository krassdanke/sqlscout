# @sqlscout/mcp

Model Context Protocol server that exposes SQLScout's SQL tooling to MCP-compatible agents (Zed, Claude Desktop, etc.).

## Install

```sh
npm i -g @sqlscout/mcp
```

## Wire into Zed

In your Zed extension's `extension.toml`:

```toml
[context_servers.sqlscout-mcp]
command = "sqlscout-mcp"
```

## Tools

- `parse` — parse SQL, return AST summary (statements, tables, columns) or error
- `playground_url` — build a `https://sqlscout.app/?q=...` link
- `reference` — look up a SQL command reference card by slug (fuzzy fallback)
- `list_topics` — enumerate reference topics grouped by category
