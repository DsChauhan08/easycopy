#!/usr/bin/env node

import { chmodSync, copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir, platform, arch } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const MCP_PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "easycopy-mcp", version: "0.1.0" };

const RELEASE_OWNER = "DsChauhan08";
const RELEASE_REPO = "easycopy";
const RELEASE_TAG = process.env.EASYCOPY_VERSION_TAG || "latest";
const CACHE_DIR = resolve(process.env.EASYCOPY_MCP_CACHE_DIR || join(homedir(), ".cache", "easycopy-mcp"));
const INLINE_LIMIT_BYTES = Number.parseInt(process.env.EASYCOPY_INLINE_LIMIT_BYTES || "200000", 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class JsonRpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, err) {
  if (err instanceof JsonRpcError) {
    return { jsonrpc: "2.0", id, error: { code: err.code, message: err.message, data: err.data } };
  }
  return { jsonrpc: "2.0", id, error: { code: -32603, message: err?.message || "Internal error" } };
}

function validateToolArgs(tool, args) {
  if (!args || typeof args !== "object") {
    throw new JsonRpcError(-32602, `Invalid arguments for tool ${tool}`);
  }

  if (tool === "render_repo") {
    if (typeof args.repo !== "string" || args.repo.trim() === "") {
      throw new JsonRpcError(-32602, "render_repo requires a non-empty 'repo' string");
    }

    const refs = [args.branch, args.tag, args.commit].filter((v) => v !== undefined);
    if (refs.length > 1) {
      throw new JsonRpcError(-32602, "Only one of 'branch', 'tag', or 'commit' may be provided");
    }
  }

  if (tool === "get_cxml") {
    if (typeof args.repo !== "string" || args.repo.trim() === "") {
      throw new JsonRpcError(-32602, "get_cxml requires a non-empty 'repo' string");
    }
    if (args.max_bytes !== undefined && (typeof args.max_bytes !== "number" || Number.isNaN(args.max_bytes) || args.max_bytes <= 0)) {
      throw new JsonRpcError(-32602, "get_cxml requires numeric 'max_bytes' > 0");
    }
  }
}

function getAssetInfo() {
  const p = platform();
  const a = arch();

  if (p === "linux" && a === "x64") {
    return {
      artifactNamePattern: /easycopy_.*_amd64\.deb$/,
      extractedBinary: "easycopy",
      localBinaryName: "easycopy-linux-x64",
      extract: extractDeb,
    };
  }

  if (p === "darwin" && a === "x64") {
    return {
      artifactNamePattern: /easycopy-x86_64-apple-darwin-.*\.dmg$/,
      extractedBinary: "easycopy",
      localBinaryName: "easycopy-darwin-x64",
      extract: extractDmg,
    };
  }

  if (p === "win32" && a === "x64") {
    return {
      artifactNamePattern: /easycopy-x86_64-pc-windows-msvc-.*\.zip$/,
      extractedBinary: "easycopy.exe",
      localBinaryName: "easycopy-windows-x64.exe",
      extract: extractZip,
    };
  }

  throw new JsonRpcError(-32603, `Unsupported platform for auto-binary download: ${p}/${a}`);
}

function getLocalEasycopyCandidate() {
  if (process.env.EASYCOPY_PATH) {
    return process.env.EASYCOPY_PATH;
  }

  const fromRepo = resolve(__dirname, "..", "..", "target", "release", platform() === "win32" ? "easycopy.exe" : "easycopy");
  if (existsSync(fromRepo)) {
    return fromRepo;
  }

  return null;
}

async function ensureEasycopyBinary() {
  const localCandidate = getLocalEasycopyCandidate();
  if (localCandidate && existsSync(localCandidate)) {
    return localCandidate;
  }

  const assetInfo = getAssetInfo();
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachedBinaryPath = join(CACHE_DIR, assetInfo.localBinaryName);
  if (existsSync(cachedBinaryPath)) {
    return cachedBinaryPath;
  }

  const release = await fetchReleaseMeta();
  const asset = release.assets.find((a) => assetInfo.artifactNamePattern.test(a.name));
  if (!asset) {
    throw new JsonRpcError(
      -32603,
      `No compatible release asset found in ${release.tag_name} for ${platform()}/${arch()}`
    );
  }

  const downloadPath = join(CACHE_DIR, asset.name);
  await downloadFile(asset.browser_download_url, downloadPath);
  await assetInfo.extract(downloadPath, cachedBinaryPath, assetInfo.extractedBinary);

  if (platform() !== "win32") {
    chmodSync(cachedBinaryPath, 0o755);
  }

  return cachedBinaryPath;
}

async function fetchReleaseMeta() {
  const url = RELEASE_TAG === "latest"
    ? `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`
    : `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/tags/${encodeURIComponent(RELEASE_TAG)}`;

  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "easycopy-mcp",
    },
  });

  if (!res.ok) {
    throw new JsonRpcError(-32603, `Failed to fetch release metadata: HTTP ${res.status}`);
  }

  return await res.json();
}

async function downloadFile(url, outPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": "easycopy-mcp" },
  });

  if (!res.ok || !res.body) {
    throw new JsonRpcError(-32603, `Failed downloading release asset: HTTP ${res.status}`);
  }

  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
}

function runCmd(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
      } else {
        reject(new JsonRpcError(-32603, `${command} failed with exit code ${code}`, { stderr, stdout }));
      }
    });
  });
}

async function extractDeb(debPath, outBinaryPath, binaryName) {
  const workDir = join(CACHE_DIR, `extract-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(workDir, { recursive: true });
  await runCmd("ar", ["x", debPath], { cwd: workDir });

  const candidates = ["data.tar.xz", "data.tar.gz", "data.tar.zst"];
  const dataTar = candidates.find((name) => existsSync(join(workDir, name)));
  if (!dataTar) {
    throw new JsonRpcError(-32603, "Unable to locate data tar in deb package");
  }

  await runCmd("tar", ["-xf", join(workDir, dataTar), "./usr/bin/" + binaryName], { cwd: workDir });
  const src = join(workDir, "usr", "bin", binaryName);
  copyFileSync(src, outBinaryPath);
}

async function extractZip(zipPath, outBinaryPath, binaryName) {
  const workDir = join(CACHE_DIR, `extract-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(workDir, { recursive: true });

  if (platform() === "win32") {
    await runCmd("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path \"${zipPath}\" -DestinationPath \"${workDir}\" -Force`,
    ]);
  } else {
    await runCmd("unzip", ["-o", zipPath, "-d", workDir]);
  }

  const src = join(workDir, binaryName);
  copyFileSync(src, outBinaryPath);
}

async function extractDmg(dmgPath, outBinaryPath, binaryName) {
  const mountPoint = join(CACHE_DIR, `mnt-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(mountPoint, { recursive: true });

  await runCmd("hdiutil", ["attach", dmgPath, "-mountpoint", mountPoint, "-nobrowse", "-quiet"]);
  try {
    const src = join(mountPoint, binaryName);
    copyFileSync(src, outBinaryPath);
  } finally {
    await runCmd("hdiutil", ["detach", mountPoint, "-quiet"]);
  }
}

function buildEasycopyArgs(args, outputPath) {
  const cmdArgs = [args.repo, "--no-open", "-o", outputPath];
  if (typeof args.max_bytes === "number") {
    cmdArgs.push("--max-bytes", String(args.max_bytes));
  }
  if (typeof args.branch === "string") {
    cmdArgs.push("--branch", args.branch);
  }
  if (typeof args.tag === "string") {
    cmdArgs.push("--tag", args.tag);
  }
  if (typeof args.commit === "string") {
    cmdArgs.push("--commit", args.commit);
  }
  if (args.no_progress === true) {
    cmdArgs.push("--no-progress");
  }
  return cmdArgs;
}

function extractMetrics(stderrText) {
  const metrics = {};
  const found = stderrText.match(/Found (\d+) files total \((\d+) will be rendered, (\d+) skipped\)/);
  if (found) {
    metrics.total_files = Number(found[1]);
    metrics.rendered_files = Number(found[2]);
    metrics.skipped_files = Number(found[3]);
  }

  const wrote = stderrText.match(/Wrote ([^\s]+\s[^\s]+) to (.+)$/m);
  if (wrote) {
    metrics.output_size_human = wrote[1];
    metrics.output_path = wrote[2].trim();
  }

  return metrics;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function handleRenderRepo(args) {
  validateToolArgs("render_repo", args);
  const easycopyPath = await ensureEasycopyBinary();

  const outputPath = args.out_path
    ? resolve(args.out_path)
    : resolve(process.cwd(), `easycopy-${Date.now()}.html`);
  const cmdArgs = buildEasycopyArgs(args, outputPath);

  const result = await runCmd(easycopyPath, cmdArgs, { cwd: process.cwd() });
  const metrics = extractMetrics(result.stderr);

  let inlineHtml = null;
  if (args.return_inline === true) {
    const html = readFileSync(outputPath, "utf8");
    if (Buffer.byteLength(html, "utf8") <= INLINE_LIMIT_BYTES) {
      inlineHtml = html;
    }
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: true,
          repo: args.repo,
          output_path: outputPath,
          output_sha256: existsSync(outputPath) ? sha256Hex(readFileSync(outputPath)) : null,
          metrics,
          stderr_summary: result.stderr.split("\n").filter(Boolean).slice(-8),
          inline_html: inlineHtml,
        }, null, 2),
      },
    ],
  };
}

async function handleGetCxml(args) {
  validateToolArgs("get_cxml", args);
  const easycopyPath = await ensureEasycopyBinary();
  const htmlPath = resolve(process.cwd(), `easycopy-cxml-${Date.now()}.html`);
  const cmdArgs = buildEasycopyArgs({
    repo: args.repo,
    max_bytes: args.max_bytes ?? 50 * 1024,
    branch: args.branch,
    tag: args.tag,
    commit: args.commit,
    no_progress: true,
  }, htmlPath);

  const result = await runCmd(easycopyPath, cmdArgs, { cwd: process.cwd() });
  const html = readFileSync(htmlPath, "utf8");
  const marker = "<textarea id=\"llm-text\" readonly>";
  const end = "</textarea>";
  const startIdx = html.indexOf(marker);
  const endIdx = startIdx >= 0 ? html.indexOf(end, startIdx) : -1;
  const cxmlEscaped = startIdx >= 0 && endIdx >= 0
    ? html.slice(startIdx + marker.length, endIdx)
    : "";
  const cxml = cxmlEscaped
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          ok: true,
          repo: args.repo,
          cxml,
          cxml_size_bytes: Buffer.byteLength(cxml, "utf8"),
          stderr_summary: result.stderr.split("\n").filter(Boolean).slice(-8),
        }, null, 2),
      },
    ],
  };
}

function listTools() {
  return {
    tools: [
      {
        name: "render_repo",
        description: "Run easycopy against a local path or git URL and generate HTML output",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string", description: "Git URL or local directory" },
            out_path: { type: "string", description: "Optional HTML output path" },
            max_bytes: { type: "number", description: "Max bytes per file to render" },
            branch: { type: "string", description: "Git branch to clone" },
            tag: { type: "string", description: "Git tag to clone" },
            commit: { type: "string", description: "Git commit hash to checkout" },
            no_progress: { type: "boolean", description: "Disable progress output" },
            return_inline: { type: "boolean", description: "Return HTML inline when small" },
          },
          required: ["repo"],
          additionalProperties: false,
        },
      },
      {
        name: "get_cxml",
        description: "Run easycopy and extract LLM CXML content from generated HTML",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string", description: "Git URL or local directory" },
            max_bytes: { type: "number", description: "Max bytes per file to render" },
            branch: { type: "string", description: "Git branch to clone" },
            tag: { type: "string", description: "Git tag to clone" },
            commit: { type: "string", description: "Git commit hash to checkout" },
          },
          required: ["repo"],
          additionalProperties: false,
        },
      },
    ],
  };
}

async function onRequest(request) {
  const { id, method, params } = request;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, listTools());
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === "render_repo") {
      const result = await handleRenderRepo(args);
      return jsonRpcResult(id, result);
    }
    if (name === "get_cxml") {
      const result = await handleGetCxml(args);
      return jsonRpcResult(id, result);
    }

    throw new JsonRpcError(-32601, `Unknown tool: ${name}`);
  }

  if (method === "ping") {
    return jsonRpcResult(id, { ok: true });
  }

  throw new JsonRpcError(-32601, `Method not found: ${method}`);
}

function writeMessage(msg) {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(header);
  process.stdout.write(body);
}

async function handleMessageObject(req) {
  if (!req || typeof req !== "object") {
    writeMessage(jsonRpcError(null, new JsonRpcError(-32600, "Invalid Request")));
    return;
  }

  try {
    const response = await onRequest(req);
    if (req.id !== undefined && req.id !== null) {
      writeMessage(response);
    }
  } catch (err) {
    if (req.id !== undefined && req.id !== null) {
      writeMessage(jsonRpcError(req.id, err));
    }
  }
}

let incoming = Buffer.alloc(0);
let processing = Promise.resolve();

process.stdin.on("data", (chunk) => {
  incoming = Buffer.concat([incoming, chunk]);

  while (true) {
    const headerEnd = incoming.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      break;
    }

    const headerText = incoming.slice(0, headerEnd).toString("utf8");
    const headers = headerText.split("\r\n");
    const contentLengthHeader = headers.find((h) => h.toLowerCase().startsWith("content-length:"));
    if (!contentLengthHeader) {
      writeMessage(jsonRpcError(null, new JsonRpcError(-32700, "Missing Content-Length header")));
      incoming = Buffer.alloc(0);
      break;
    }

    const contentLength = Number.parseInt(contentLengthHeader.split(":")[1].trim(), 10);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      writeMessage(jsonRpcError(null, new JsonRpcError(-32700, "Invalid Content-Length header")));
      incoming = Buffer.alloc(0);
      break;
    }

    const totalLength = headerEnd + 4 + contentLength;
    if (incoming.length < totalLength) {
      break;
    }

    const body = incoming.slice(headerEnd + 4, totalLength).toString("utf8");
    incoming = incoming.slice(totalLength);

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      writeMessage(jsonRpcError(null, new JsonRpcError(-32700, "Parse error")));
      continue;
    }

    processing = processing.then(() => handleMessageObject(parsed));
  }
});
