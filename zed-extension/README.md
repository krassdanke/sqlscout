# SQLScout - Zed extension

SQL hover, code actions, diagnostics, and an MCP context server backed by the
SQLScout multi-dialect parser.

## Capabilities

| Surface              | What it does                                                                                                                                              |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| LSP `@sqlscout/ls`   | Hover summaries, "Open in SQLScout" + "Extract to .sql" code actions, parse + GROUP-BY-by-position diagnostics on SQL embedded in TS/JS/Py/Rs/Go.        |
| MCP `@sqlscout/mcp`  | Four tools in the Agent panel: `parse`, `playground_url`, `reference`, `list_topics`.                                                                     |
| Snippets             | `ssel`, `scte`, `sjoin`, `srn`, `supsert`, ... (unchanged, see `snippets/sql.json`).                                                                      |
| Task                 | "SQLScout: open selection in playground" — bind to a key for one-shot browser open.                                                                       |

## Install (dev)

Node 20+ required on the user machine (the LSP and MCP server are Node binaries
pulled lazily via `npx`).

1. In Zed: command palette -> "zed: install dev extension" -> pick this folder.
2. On first hover or agent call, `npx -y` will fetch `@sqlscout/ls` and
   `@sqlscout/mcp` from npm (~5s cold start; cached afterwards).

## Suggested keybind

Add to your Zed `keymap.json`:

```json
{ "context": "Editor", "bindings": { "cmd-alt-s": ["task::Spawn", { "task_name": "SQLScout: open selection in playground" }] } }
```

macOS users: swap `xdg-open` for `open` in `tasks.json` (or override in your
user tasks).

## Roadmap

- [ ] Tree-sitter dialect highlighting.
- [ ] Theme companion matching the SQLScout playground palette.
