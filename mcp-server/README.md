# @dschauhan08/easycopy-mcp

AI-first MCP server for repository understanding.

This package is designed for LLM workflows where **search + targeted reads** are the default path, and full HTML exports are optional.

## TL;DR

- ✅ **Primary mode**: AI retrieval (`search_code`, `read_file`, `get_context_pack`)
- ✅ **Optional mode**: export full repo (`render_repo`, `get_cxml`)
- ✅ **Structured MCP responses** for tool chaining across MCP-compatible clients
- ✅ **Safety defaults**: bounded reads, limits, binary/large-file handling

For AI workflow, this is helpful because it:
- avoids full-repo dumps,
- gives targeted file/line discovery,
- makes context retrieval faster and smaller for prompts.

## Install

```bash
npx -y @dschauhan08/easycopy-mcp
```

or globally:

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

## Recommended AI workflow

1. `index_repo` – scan and cache repository metadata
2. `search_code` – find relevant files/lines by query
3. `read_file` / `read_many` – fetch exact context only
4. `get_context_pack` – create a compact, prompt-ready bundle

Use `render_repo` only when you explicitly want a full static export.

---

## Tools

### Retrieval-first tools (default)

### `index_repo`
Build or refresh a local retrieval index.

Inputs:
- `repo` (required, local path)
- `refresh` (optional)
- `max_file_bytes` (optional)

### `search_code`
Search code/text with optional regex and glob filtering.

Inputs:
- `repo` (required)
- `query` (required)
- `regex` (optional)
- `case_sensitive` (optional)
- `include_glob` (optional, e.g. `src/**/*.ts`)
- `limit` (optional)

### `list_files`
List files with size/text metadata.

Inputs:
- `repo` (required)
- `include_glob`, `limit` (optional)

### `read_file`
Read one file with bounded line window.

Inputs:
- `repo` (required)
- `path` (required)
- `start_line`, `end_line`, `max_chars` (optional)

### `read_many`
Read many files in one call with bounded excerpts.

Inputs:
- `repo` (required)
- `paths` (required)
- `max_chars_per_file` (optional)

### `repo_map`
Compact structural map + key files.

Inputs:
- `repo` (required)
- `depth`, `max_entries` (optional)

### `stats`
Repo-level counts and extension distribution.

Inputs:
- `repo` (required)

### `get_context_pack`
Search + select + read top files into an LLM-ready pack.

Inputs:
- `repo` (required)
- `query` (required)
- `limit_files`, `max_chars_per_file` (optional)
- same search flags as `search_code`

Behavior note:
- if no files match the query, `get_context_pack` returns an **empty pack** (`selected_files: []`, `files: []`) instead of an error.

---

### Export tools (optional)

### `render_repo`
Generate full HTML output using `easycopy`.

### `get_cxml`
Generate and extract full CXML from `easycopy` output.

---

### Diagnostics + output lifecycle

### `health_check`
Runtime diagnostics and binary resolution.

### `list_outputs`
List generated output HTML files.

### `read_output`
Read excerpt from generated HTML output.

### `cleanup_outputs`
Clean old output files (`dry_run: true` by default).

## Why this is safer for LLM usage

- Bounded reads and limits by default
- Explicit argument validation
- Binary and oversized file handling in retrieval flow
- No destructive repo actions
- Optional export path kept separate from retrieval path

## Environment variables

- `EASYCOPY_PATH` – override easycopy binary path
- `EASYCOPY_VERSION_TAG` – release tag for binary fetch (`latest` default)
- `EASYCOPY_RELEASE_OWNER` / `EASYCOPY_RELEASE_REPO` – release source override
- `EASYCOPY_MCP_CACHE_DIR` – binary cache directory
- `EASYCOPY_INLINE_LIMIT_BYTES` – inline HTML cap
- `EASYCOPY_OUTPUT_DIR` – default output directory for exports
- `EASYCOPY_OUTPUT_PREFIX` – default output prefix for exports
- `GITHUB_TOKEN` – optional API/download resilience for release fetch

## Local dev

```bash
cd mcp-server
npm run check
npm run selftest
npm pack --dry-run
```

## Publishing

Publishing is automated in GitHub Actions on tags matching `mcp-v*`.
The npm package page README is updated automatically from this file at publish time.
