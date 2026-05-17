# SQLScout - Zed extension

Bridge between the Zed editor and the SQLScout multi-dialect SQL playground.

## Capabilities

| Capability      | What it does                                                       |
|-----------------|--------------------------------------------------------------------|
| `/sqlscout`     | Build a playground URL from the SQL you just typed.                |
| `/sqlscout-ref` | Insert a compact reference card for a SQL construct.               |
| Snippets        | `ssel`, `scte`, `screc`, `sjoin`, `srn`, `supsert`, ... in Zed.    |

Zed's extension surface does not (yet) host rich UI panes, so the visual flow
diagram itself stays in the web playground. The extension's job is to make the
jump there friction-free and to bring SQLScout's command reference into the
assistant context.

## Install (dev)

1. Zed v0.150+ installed.
2. From this repo: `cd zed-extension/`.
3. In Zed: command palette -> "zed: install dev extension" -> pick this folder.
4. Try it: `/sqlscout SELECT * FROM users` should produce a clickable link.

## Slash commands

### `/sqlscout [sql...]`

Builds `https://sqlscout.app/?q=<url-encoded-sql>`. With no argument it returns
the bare playground URL.

### `/sqlscout-ref <topic>`

Inserts a syntax-block + one-line summary for the requested topic. Argument
completion enumerates the catalog (`select`, `inner-join`, `with-recursive`,
`over`, `rollup`, ...).

## Snippets

Defined in `snippets/sql.json` (VS Code-compatible format, which Zed reads).
Every prefix starts with `s` (`ssel`, `scte`, `srn`, ...) to avoid colliding
with other autocomplete sources.

## Building

The crate compiles to a single `cdylib` consumed by Zed's WASM extension host:

```sh
cd zed-extension
cargo build --release --target wasm32-wasip1
```

`zed_extension_api` >= 0.2 is the only runtime dependency.

## Roadmap

- [ ] `sqlscout-ls` language server: parse diagnostics + hover cards.
- [ ] Tree-sitter grammar override for dialect-aware highlighting.
- [ ] Context server exposing the full command catalog to the assistant.
- [ ] Theme companion matching the SQLScout playground palette.
