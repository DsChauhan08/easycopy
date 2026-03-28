# @dschauhan/easycopy-mcp

MCP server that exposes `easycopy` as tools for AI clients via stdio.

It supports:
- Rendering a repository (local path or remote git URL) into a single HTML output
- Returning render metadata and optional inline HTML
- Extracting CXML text from easycopy output for LLM workflows

## Install / Run

Run directly with `npx`:

```bash
npx -y @dschauhan/easycopy-mcp
```

You can also install globally:

```bash
npm i -g @dschauhan/easycopy-mcp
easycopy-mcp
```

## Client Configuration

Example MCP client config using `npx`:

```json
{
  "mcpServers": {
    "easycopy": {
      "command": "npx",
      "args": ["-y", "@dschauhan/easycopy-mcp"],
      "env": {
        "EASYCOPY_VERSION_TAG": "latest"
      }
    }
  }
}
```

## Tools

### `render_repo`

Input:
- `repo` (required): local directory path or git URL
- `out_path` (optional): HTML output path
- `max_bytes` (optional): max file size to render
- `branch` / `tag` / `commit` (optional): git ref selectors (mutually exclusive)
- `no_progress` (optional): disable easycopy progress output
- `return_inline` (optional): include inline HTML if size is within threshold

Output:
- JSON string containing `output_path`, `metrics`, `stderr_summary`, and optional `inline_html`

### `get_cxml`

Input:
- `repo` (required)
- `max_bytes` (optional, default 51200)
- `branch` / `tag` / `commit` (optional)

Output:
- JSON string containing extracted `cxml` text and metadata

## Binary Resolution

The server resolves `easycopy` in this order:
1. `EASYCOPY_PATH` if set
2. Local repo build at `target/release/easycopy` (or `.exe`)
3. Download matching release artifact from GitHub and cache it

Cache directory default:
- `~/.cache/easycopy-mcp`

Environment variables:
- `EASYCOPY_PATH`: explicit path to binary
- `EASYCOPY_VERSION_TAG`: release tag (or `latest`)
- `EASYCOPY_MCP_CACHE_DIR`: custom cache directory
- `EASYCOPY_INLINE_LIMIT_BYTES`: max inline HTML response size

## Development

```bash
cd mcp-server
npm run check
```

## Publish

```bash
cd mcp-server
npm publish --access public
```
