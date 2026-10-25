<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code discovery

Prefer codebase-memory-mcp search_graph, trace_path, get_code_snippet, query_graph, and search_code over text search for code discovery. Index this repository first if needed. Config/string searches can use rg.

## Release boundaries

Do not present sample localStorage data as live customer data. Keep all provider sends and checkout disabled until provider acceptance tests pass. Read docs/RELEASE_STATUS.md before extending production integration paths. Never expose service credentials or collect API keys in sample UI.
