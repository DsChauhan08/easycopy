# @dschauhan08/easycopy-mcp

Production-grade MCP server for `easycopy`, built for reliable use across MCP-capable AI clients.

This server turns any repo (local or remote) into LLM-friendly artifacts:
- flattened HTML for instant exploration
- extracted CXML for direct model ingestion
- structured MCP responses for predictable tool chaining

## Why teams use this

- **Safety-first defaults**: no browser popups, bounded output options, explicit timeouts, strong argument validation
- **Cross-client MCP compatibility**: proper stdio framing, JSON-RPC handling, `structuredContent` support
- **Deterministic outputs**: checksums, metrics, stable response shape
- **Operational visibility**: built-in `health_check` diagnostics
- **Practical lifecycle tools**: list, inspect, and clean old generated outputs

## Install

```bash
npx -y @dschauhan08/easycopy-mcp
```

Or global:

```bash
npm i -g @dschauhan08/easycopy-mcp
easycopy-mcp
```

## MCP client config

```json
{
  "mcpServers": {
    "easycopy": {
      "command": "npx",
      "args": ["-y", "@dschauhan08/easycopy-mcp"],
      "env": {
        "EASYCOPY_VERSION_TAG": "latest"
      }
    }
  }
}
```

This works with MCP-compatible clients across major ecosystems (Claude Desktop-compatible clients, Cursor-compatible clients, and other MCP SDK-based tooling).

## Tools

### `render_repo`

Render a repository into a single HTML output and optionally include inline HTML/CXML in the result.

Inputs:
- `repo` (required)
- `out_path` (optional)
- `output_dir` (optional)
- `output_prefix` (optional)
- `max_bytes` (optional)
- `branch` / `tag` / `commit` (optional, mutually exclusive)
- `no_progress` (optional)
- `include_inline_html` (optional)
- `return_inline` (legacy alias, optional)
- `inline_limit_bytes` (optional)
- `include_cxml` (optional)
- `include_output_excerpt` (optional)
- `timeout_ms` (optional)

Returns:
- `structuredContent` with output path, checksums, metrics, binary source/version, stderr/stdout tails
- optional `inline_html`, `output_excerpt`, and `cxml`

### `get_cxml`

Generate output and extract CXML only.

Inputs:
- `repo` (required)
- `max_bytes`, `branch`, `tag`, `commit`, `no_progress`, `timeout_ms` (optional)

Returns:
- `structuredContent` with `cxml`, checksum, render metrics, runtime details

### `health_check`

Runtime and binary diagnostics.

Inputs:
- `resolve_binary` (optional, default `true`)

Returns:
- node/runtime info, platform, env hints, cache path, resolved binary details

### `list_outputs`

List generated HTML outputs sorted by newest first.

Inputs:
- `directory` (optional)
- `prefix` (optional)
- `limit` (optional)

### `read_output`

Read excerpt plus checksum from an existing generated output file.

Inputs:
- `path` (required)
- `max_chars` (optional)

### `cleanup_outputs`

Delete old generated outputs while keeping recent ones.

Inputs:
- `directory` (optional)
- `prefix` (optional)
- `keep_latest` (optional)
- `dry_run` (optional, default `true`)

## Safety and reliability notes

- Commands run with timeouts and typed argument checks
- Archive extraction validates platform/tool availability
- Temporary extraction directories are cleaned up
- No destructive repo actions; this server only calls `easycopy`
- Output management tools default to safe behavior (`dry_run: true`)

## Environment variables

- `EASYCOPY_PATH`: explicit easycopy binary path
- `EASYCOPY_VERSION_TAG`: release tag to fetch (`latest` default)
- `EASYCOPY_RELEASE_OWNER`: GitHub owner override (default `DsChauhan08`)
- `EASYCOPY_RELEASE_REPO`: GitHub repo override (default `easycopy`)
- `EASYCOPY_MCP_CACHE_DIR`: custom binary cache directory
- `EASYCOPY_INLINE_LIMIT_BYTES`: default inline HTML cap
- `EASYCOPY_OUTPUT_DIR`: default output directory for generated HTML
- `EASYCOPY_OUTPUT_PREFIX`: default output file prefix
- `GITHUB_TOKEN`: optional token for release API/download resilience

## Local development

```bash
cd mcp-server
npm run check
npm run selftest
npm pack --dry-run
```

## Publishing notes

This package is published by repository workflow on `mcp-v*` tags. npm package page content is sourced from this README automatically during `npm publish`.

```bash
cd mcp-server
npm publish --access public
```
