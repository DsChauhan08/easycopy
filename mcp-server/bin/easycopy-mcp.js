#!/usr/bin/env node

import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir, homedir, platform, arch } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "easycopy-mcp", version: "0.2.0" };
const ROOT = "easycopy-mcp";

const DEFAULT_RELEASE_OWNER = "DsChauhan08";
const DEFAULT_RELEASE_REPO = "easycopy";
const DEFAULT_RELEASE_TAG = "latest";
const DEFAULT_MAX_BYTES = 50 * 1024;
const DEFAULT_INLINE_LIMIT = 200_000;
const DEFAULT_OUTPUT_DIR = process.cwd();
const DEFAULT_OUTPUT_PREFIX = "easycopy";

const CACHE_DIR = resolve(process.env.EASYCOPY_MCP_CACHE_DIR || join(homedir(), ".cache", ROOT));
const RELEASE_OWNER = process.env.EASYCOPY_RELEASE_OWNER || DEFAULT_RELEASE_OWNER;
const RELEASE_REPO = process.env.EASYCOPY_RELEASE_REPO || DEFAULT_RELEASE_REPO;
const RELEASE_TAG = process.env.EASYCOPY_VERSION_TAG || DEFAULT_RELEASE_TAG;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class JsonRpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

function result(id, payload) {
  return { jsonrpc: "2.0", id, result: payload };
}

function error(id, err) {
  if (err instanceof JsonRpcError) {
    return { jsonrpc: "2.0", id, error: { code: err.code, message: err.message, data: err.data } };
  }
  return { jsonrpc: "2.0", id, error: { code: -32603, message: err?.message || "Internal error" } };
}

function assertObject(value, msg) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new JsonRpcError(-32602, msg);
  }
}

function ensureNumber(value, name, min = 1) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "number" || Number.isNaN(value) || value < min) {
    throw new JsonRpcError(-32602, `'${name}' must be a number >= ${min}`);
  }
}

function ensureBoolean(value, name) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "boolean") {
    throw new JsonRpcError(-32602, `'${name}' must be a boolean`);
  }
}

function ensureString(value, name, allowEmpty = false) {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string") {
    throw new JsonRpcError(-32602, `'${name}' must be a string`);
  }
  if (!allowEmpty && value.trim() === "") {
    throw new JsonRpcError(-32602, `'${name}' cannot be empty`);
  }
}

function validateRefArgs(args) {
  const refs = [args.branch, args.tag, args.commit].filter((v) => v !== undefined);
  if (refs.length > 1) {
    throw new JsonRpcError(-32602, "Only one of 'branch', 'tag', or 'commit' may be provided");
  }
}

function validateRenderRepoArgs(args) {
  assertObject(args, "Invalid arguments for render_repo");
  if (typeof args.repo !== "string" || args.repo.trim() === "") {
    throw new JsonRpcError(-32602, "'repo' is required and must be a non-empty string");
  }
  ensureNumber(args.max_bytes, "max_bytes", 1);
  ensureNumber(args.inline_limit_bytes, "inline_limit_bytes", 1);
  ensureNumber(args.timeout_ms, "timeout_ms", 1000);
  ensureString(args.out_path, "out_path");
  ensureBoolean(args.include_inline_html, "include_inline_html");
  ensureBoolean(args.return_inline, "return_inline");
  ensureBoolean(args.include_cxml, "include_cxml");
  ensureBoolean(args.include_output_excerpt, "include_output_excerpt");
  validateRefArgs(args);
}

function validateGetCxmlArgs(args) {
  assertObject(args, "Invalid arguments for get_cxml");
  if (typeof args.repo !== "string" || args.repo.trim() === "") {
    throw new JsonRpcError(-32602, "'repo' is required and must be a non-empty string");
  }
  ensureNumber(args.max_bytes, "max_bytes", 1);
  ensureNumber(args.timeout_ms, "timeout_ms", 1000);
  validateRefArgs(args);
}

function validateHealthArgs(args) {
  if (args === undefined) {
    return;
  }
  assertObject(args, "Invalid arguments for health_check");
  ensureBoolean(args.resolve_binary, "resolve_binary");
}

function validateListOutputsArgs(args) {
  if (args === undefined) {
    return;
  }
  assertObject(args, "Invalid arguments for list_outputs");
  ensureString(args.directory, "directory");
  ensureString(args.prefix, "prefix");
  ensureNumber(args.limit, "limit", 1);
}

function validateReadOutputArgs(args) {
  assertObject(args, "Invalid arguments for read_output");
  ensureString(args.path, "path");
  ensureNumber(args.max_chars, "max_chars", 100);
}

function validateCleanupArgs(args) {
  if (args === undefined) {
    return;
  }
  assertObject(args, "Invalid arguments for cleanup_outputs");
  ensureString(args.directory, "directory");
  ensureString(args.prefix, "prefix");
  ensureNumber(args.keep_latest, "keep_latest", 0);
  ensureBoolean(args.dry_run, "dry_run");
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function sha256Bytes(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function runCmd(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1500);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (spawnErr) => {
      clearTimeout(timer);
      reject(new JsonRpcError(-32603, `Failed to start command '${command}'`, { cause: spawnErr.message }));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new JsonRpcError(-32603, `Command timed out: ${command}`, { timeout_ms: timeoutMs, stderr, stdout }));
        return;
      }
      if (code !== 0) {
        reject(new JsonRpcError(-32603, `${command} failed with exit code ${code}`, { stderr, stdout }));
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

function commandExists(command) {
  const cmd = platform() === "win32" ? "where" : "which";
  const found = spawnSync(cmd, [command], { stdio: "ignore" });
  return found.status === 0;
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

  if (p === "win32" && a === "x64") {
    return {
      artifactNamePattern: /easycopy-x86_64-pc-windows-msvc-.*\.zip$/,
      extractedBinary: "easycopy.exe",
      localBinaryName: "easycopy-windows-x64.exe",
      extract: extractZip,
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

  throw new JsonRpcError(-32603, `Unsupported platform for auto-download: ${p}/${a}`);
}

function getEasycopyCandidates() {
  const candidates = [];

  if (process.env.EASYCOPY_PATH) {
    candidates.push({ path: process.env.EASYCOPY_PATH, source: "env" });
  }

  const localBuildPath = resolve(__dirname, "..", "..", "target", "release", platform() === "win32" ? "easycopy.exe" : "easycopy");
  candidates.push({ path: localBuildPath, source: "local-build" });

  return candidates;
}

async function fetchReleaseMeta() {
  const url = RELEASE_TAG === "latest"
    ? `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/latest`
    : `https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/tags/${encodeURIComponent(RELEASE_TAG)}`;

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": ROOT,
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new JsonRpcError(-32603, `Failed to fetch release metadata (HTTP ${res.status})`, { url });
  }

  return await res.json();
}

async function downloadFile(url, outPath) {
  const headers = { "User-Agent": ROOT };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok || !res.body) {
    throw new JsonRpcError(-32603, `Failed to download binary asset (HTTP ${res.status})`, { url });
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
}

async function extractDeb(debPath, outBinaryPath, binaryName) {
  if (!commandExists("ar") || !commandExists("tar")) {
    throw new JsonRpcError(-32603, "Missing required extract tools 'ar' or 'tar' for .deb extraction");
  }

  const dir = mkdtempSync(join(tmpdir(), `${ROOT}-deb-`));
  try {
    await runCmd("ar", ["x", debPath], { cwd: dir });
    const tarNames = ["data.tar.xz", "data.tar.gz", "data.tar.zst"];
    const tarName = tarNames.find((name) => existsSync(join(dir, name)));
    if (!tarName) {
      throw new JsonRpcError(-32603, "Unable to locate data archive in .deb package");
    }
    await runCmd("tar", ["-xf", join(dir, tarName), `./usr/bin/${binaryName}`], { cwd: dir });
    copyFileSync(join(dir, "usr", "bin", binaryName), outBinaryPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function extractZip(zipPath, outBinaryPath, binaryName) {
  const dir = mkdtempSync(join(tmpdir(), `${ROOT}-zip-`));
  try {
    if (platform() === "win32") {
      await runCmd("powershell", ["-NoProfile", "-Command", `Expand-Archive -Path \"${zipPath}\" -DestinationPath \"${dir}\" -Force`]);
    } else {
      if (!commandExists("unzip")) {
        throw new JsonRpcError(-32603, "Missing required extract tool 'unzip' for .zip extraction");
      }
      await runCmd("unzip", ["-o", zipPath, "-d", dir]);
    }
    copyFileSync(join(dir, binaryName), outBinaryPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function extractDmg(dmgPath, outBinaryPath, binaryName) {
  if (!commandExists("hdiutil")) {
    throw new JsonRpcError(-32603, "Missing required tool 'hdiutil' for .dmg extraction");
  }
  const mount = mkdtempSync(join(tmpdir(), `${ROOT}-dmg-`));
  try {
    await runCmd("hdiutil", ["attach", dmgPath, "-mountpoint", mount, "-nobrowse", "-quiet"]);
    copyFileSync(join(mount, binaryName), outBinaryPath);
  } finally {
    await runCmd("hdiutil", ["detach", mount, "-quiet"]).catch(() => {});
    rmSync(mount, { recursive: true, force: true });
  }
}

async function resolveEasycopyBinary() {
  for (const candidate of getEasycopyCandidates()) {
    if (candidate.path && existsSync(candidate.path)) {
      return { path: candidate.path, source: candidate.source, version: await getEasycopyVersion(candidate.path) };
    }
  }

  if (commandExists("easycopy")) {
    return { path: "easycopy", source: "path", version: await getEasycopyVersion("easycopy") };
  }

  const assetInfo = getAssetInfo();
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachedBinaryPath = join(CACHE_DIR, assetInfo.localBinaryName);
  if (existsSync(cachedBinaryPath)) {
    return { path: cachedBinaryPath, source: "cache", version: await getEasycopyVersion(cachedBinaryPath) };
  }

  const release = await fetchReleaseMeta();
  const asset = (release.assets || []).find((a) => assetInfo.artifactNamePattern.test(a.name));
  if (!asset) {
    throw new JsonRpcError(
      -32603,
      `No compatible release artifact found for ${platform()}/${arch()}. Set EASYCOPY_PATH to a local binary.`
    );
  }

  const archivePath = join(CACHE_DIR, asset.name);
  await downloadFile(asset.browser_download_url, archivePath);
  await assetInfo.extract(archivePath, cachedBinaryPath, assetInfo.extractedBinary);
  if (platform() !== "win32") {
    chmodSync(cachedBinaryPath, 0o755);
  }

  return { path: cachedBinaryPath, source: "release", version: await getEasycopyVersion(cachedBinaryPath) };
}

async function getEasycopyVersion(binaryPath) {
  try {
    const res = await runCmd(binaryPath, ["--version"], { timeoutMs: 20_000 });
    return res.stdout.trim() || res.stderr.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function buildEasycopyArgs(input, outputPath) {
  const args = [input.repo, "--no-open", "-o", outputPath];
  args.push("--max-bytes", String(input.max_bytes ?? DEFAULT_MAX_BYTES));
  args.push("--no-progress");

  if (input.no_progress === false) {
    args.pop();
  }
  if (typeof input.branch === "string") {
    args.push("--branch", input.branch);
  }
  if (typeof input.tag === "string") {
    args.push("--tag", input.tag);
  }
  if (typeof input.commit === "string") {
    args.push("--commit", input.commit);
  }
  return args;
}

function extractMetrics(stderrText) {
  const metrics = {};

  const found = stderrText.match(/Found (\d+) files total \((\d+) will be rendered, (\d+) skipped\)/);
  if (found) {
    metrics.total_files = Number(found[1]);
    metrics.rendered_files = Number(found[2]);
    metrics.skipped_files = Number(found[3]);
  }

  const wrote = stderrText.match(/Wrote (.+?) to (.+)$/m);
  if (wrote) {
    metrics.output_size_human = wrote[1].trim();
    metrics.output_path = wrote[2].trim();
  }

  const head = stderrText.match(/HEAD: ([0-9a-fA-F]+)/);
  if (head) {
    metrics.head_commit = head[1];
  }

  return metrics;
}

function extractCxmlFromHtml(html) {
  const marker = "<textarea id=\"llm-text\" readonly>";
  const endMarker = "</textarea>";
  const start = html.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const end = html.indexOf(endMarker, start + marker.length);
  if (end < 0) {
    return "";
  }

  const escaped = html.slice(start + marker.length, end);
  return escaped
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function getOutputDirectoryPath(input) {
  return resolve(input || process.env.EASYCOPY_OUTPUT_DIR || DEFAULT_OUTPUT_DIR);
}

function getOutputPrefix(input) {
  return input || process.env.EASYCOPY_OUTPUT_PREFIX || DEFAULT_OUTPUT_PREFIX;
}

function listOutputFiles(directory, prefix) {
  if (!existsSync(directory)) {
    return [];
  }

  const entries = readdirSync(directory);
  const out = [];
  for (const entry of entries) {
    if (!entry.startsWith(prefix) || !entry.endsWith(".html")) {
      continue;
    }
    const abs = join(directory, entry);
    try {
      const st = statSync(abs);
      if (!st.isFile()) {
        continue;
      }
      out.push({
        path: abs,
        name: entry,
        size_bytes: st.size,
        modified_ms: st.mtimeMs,
      });
    } catch {
      continue;
    }
  }

  out.sort((a, b) => b.modified_ms - a.modified_ms);
  return out;
}

function renderRepoOutputPath(args) {
  if (args.out_path) {
    return resolve(args.out_path);
  }
  const outputDir = getOutputDirectoryPath(args.output_dir);
  const prefix = getOutputPrefix(args.output_prefix);
  const timestamp = Date.now();
  mkdirSync(outputDir, { recursive: true });
  return join(outputDir, `${prefix}-${timestamp}.html`);
}

function safeExcerpt(text, maxChars) {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}

function makeTextAndStructured(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

async function toolRenderRepo(args) {
  validateRenderRepoArgs(args);
  const binary = await resolveEasycopyBinary();

  const outputPath = renderRepoOutputPath(args);
  const cmdArgs = buildEasycopyArgs(args, outputPath);
  const run = await runCmd(binary.path, cmdArgs, { timeoutMs: args.timeout_ms ?? 15 * 60 * 1000 });

  const htmlBuffer = readFileSync(outputPath);
  const htmlText = htmlBuffer.toString("utf8");
  const limit = args.inline_limit_bytes ?? Number.parseInt(process.env.EASYCOPY_INLINE_LIMIT_BYTES || String(DEFAULT_INLINE_LIMIT), 10);
  const includeInline = args.include_inline_html === true || args.return_inline === true;
  const includeCxml = args.include_cxml === true;
  const includeExcerpt = args.include_output_excerpt !== false;

  const data = {
    ok: true,
    tool: "render_repo",
    repo: args.repo,
    output_path: outputPath,
    output_size_bytes: htmlBuffer.byteLength,
    output_sha256: sha256Bytes(htmlBuffer),
    easycopy: binary,
    metrics: extractMetrics(run.stderr),
    stderr_tail: run.stderr.split("\n").filter(Boolean).slice(-12),
    stdout_tail: run.stdout.split("\n").filter(Boolean).slice(-12),
    inline_html: includeInline && htmlBuffer.byteLength <= limit ? htmlText : null,
    output_excerpt: includeExcerpt ? safeExcerpt(htmlText, 2000) : null,
    cxml: includeCxml ? extractCxmlFromHtml(htmlText) : null,
  };

  return makeTextAndStructured(data);
}

async function toolGetCxml(args) {
  validateGetCxmlArgs(args);
  const binary = await resolveEasycopyBinary();

  const outputPath = resolve(process.cwd(), `easycopy-cxml-${Date.now()}.html`);
  const cmdArgs = buildEasycopyArgs(args, outputPath);
  const run = await runCmd(binary.path, cmdArgs, { timeoutMs: args.timeout_ms ?? 15 * 60 * 1000 });

  const html = readFileSync(outputPath, "utf8");
  const cxml = extractCxmlFromHtml(html);
  const cxmlBuf = Buffer.from(cxml, "utf8");

  const data = {
    ok: true,
    tool: "get_cxml",
    repo: args.repo,
    cxml,
    cxml_size_bytes: cxmlBuf.byteLength,
    cxml_sha256: sha256Bytes(cxmlBuf),
    easycopy: binary,
    metrics: extractMetrics(run.stderr),
    stderr_tail: run.stderr.split("\n").filter(Boolean).slice(-12),
    stdout_tail: run.stdout.split("\n").filter(Boolean).slice(-12),
  };

  return makeTextAndStructured(data);
}

async function toolHealthCheck(args) {
  validateHealthArgs(args);
  const data = {
    ok: true,
    tool: "health_check",
    protocol_version: PROTOCOL_VERSION,
    server_info: SERVER_INFO,
    platform: { os: platform(), arch: arch() },
    node: process.version,
    cache_dir: CACHE_DIR,
    env_hints: {
      EASYCOPY_PATH: process.env.EASYCOPY_PATH ? "set" : "unset",
      EASYCOPY_VERSION_TAG: process.env.EASYCOPY_VERSION_TAG || "latest",
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ? "set" : "unset",
    },
  };

  if (args?.resolve_binary !== false) {
    const binary = await resolveEasycopyBinary();
    data.easycopy = binary;
  }

  return makeTextAndStructured(data);
}

async function toolListOutputs(args) {
  validateListOutputsArgs(args);
  const directory = getOutputDirectoryPath(args?.directory);
  const prefix = getOutputPrefix(args?.prefix);
  const limit = args?.limit ?? 20;

  const files = listOutputFiles(directory, prefix).slice(0, limit);
  const data = {
    ok: true,
    tool: "list_outputs",
    directory,
    prefix,
    count: files.length,
    files,
  };
  return makeTextAndStructured(data);
}

async function toolReadOutput(args) {
  validateReadOutputArgs(args);
  const maxChars = args.max_chars ?? 20_000;
  const outputPath = resolve(args.path);
  if (!existsSync(outputPath)) {
    throw new JsonRpcError(-32602, "Output file does not exist", { path: outputPath });
  }

  const buf = readFileSync(outputPath);
  const text = buf.toString("utf8");
  const data = {
    ok: true,
    tool: "read_output",
    path: outputPath,
    size_bytes: buf.byteLength,
    sha256: sha256Bytes(buf),
    excerpt: safeExcerpt(text, maxChars),
  };
  return makeTextAndStructured(data);
}

async function toolCleanupOutputs(args) {
  validateCleanupArgs(args);
  const directory = getOutputDirectoryPath(args?.directory);
  const prefix = getOutputPrefix(args?.prefix);
  const keepLatest = args?.keep_latest ?? 10;
  const dryRun = args?.dry_run !== false;

  const files = listOutputFiles(directory, prefix);
  const toDelete = files.slice(keepLatest);

  const deleted = [];
  if (!dryRun) {
    for (const file of toDelete) {
      try {
        unlinkSync(file.path);
        deleted.push(file.path);
      } catch {
        continue;
      }
    }
  }

  const data = {
    ok: true,
    tool: "cleanup_outputs",
    directory,
    prefix,
    keep_latest: keepLatest,
    dry_run: dryRun,
    total_found: files.length,
    candidates: toDelete.map((f) => f.path),
    deleted,
  };
  return makeTextAndStructured(data);
}

function toolsListPayload() {
  return {
    tools: [
      {
        name: "render_repo",
        description: "Render local/remote repository to easycopy HTML for LLM and human inspection.",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string", description: "Local directory path or Git URL." },
            out_path: { type: "string", description: "Optional output HTML file path." },
            output_dir: { type: "string", description: "Optional output directory when out_path is not provided." },
            output_prefix: { type: "string", description: "Optional output filename prefix (default easycopy)." },
            max_bytes: { type: "number", description: "Max bytes per rendered file (default 51200)." },
            branch: { type: "string" },
            tag: { type: "string" },
            commit: { type: "string" },
            no_progress: { type: "boolean", description: "Disable progress output (default true)." },
            include_inline_html: { type: "boolean", description: "Include HTML body inline when not too large." },
            inline_limit_bytes: { type: "number", description: "Inline HTML cap in bytes." },
            include_cxml: { type: "boolean", description: "Include CXML text in result." },
            include_output_excerpt: { type: "boolean", description: "Include first ~2000 chars of HTML for quick previews." },
            timeout_ms: { type: "number", description: "Command timeout in milliseconds." },
          },
          required: ["repo"],
          additionalProperties: false,
        },
      },
      {
        name: "get_cxml",
        description: "Run easycopy and return CXML text optimized for LLM ingestion.",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string", description: "Local directory path or Git URL." },
            max_bytes: { type: "number" },
            branch: { type: "string" },
            tag: { type: "string" },
            commit: { type: "string" },
            no_progress: { type: "boolean" },
            timeout_ms: { type: "number" },
          },
          required: ["repo"],
          additionalProperties: false,
        },
      },
      {
        name: "health_check",
        description: "Return runtime diagnostics and binary resolution status for MCP clients.",
        inputSchema: {
          type: "object",
          properties: {
            resolve_binary: { type: "boolean", description: "Resolve easycopy binary (default true)." },
          },
          additionalProperties: false,
        },
      },
      {
        name: "list_outputs",
        description: "List generated easycopy HTML outputs sorted by recent modification time.",
        inputSchema: {
          type: "object",
          properties: {
            directory: { type: "string", description: "Directory containing generated outputs." },
            prefix: { type: "string", description: "Filename prefix filter (default easycopy)." },
            limit: { type: "number", description: "Maximum files to return (default 20)." },
          },
          additionalProperties: false,
        },
      },
      {
        name: "read_output",
        description: "Read and return an excerpt from a generated easycopy HTML file.",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative path to generated HTML output." },
            max_chars: { type: "number", description: "Max excerpt characters (default 20000)." },
          },
          required: ["path"],
          additionalProperties: false,
        },
      },
      {
        name: "cleanup_outputs",
        description: "Delete older generated outputs while keeping newest files.",
        inputSchema: {
          type: "object",
          properties: {
            directory: { type: "string", description: "Directory containing generated outputs." },
            prefix: { type: "string", description: "Filename prefix filter (default easycopy)." },
            keep_latest: { type: "number", description: "Number of newest files to retain (default 10)." },
            dry_run: { type: "boolean", description: "Preview deletions only (default true)." },
          },
          additionalProperties: false,
        },
      },
    ],
  };
}

async function handleRequest(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return result(id, {
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: SERVER_INFO,
      capabilities: { tools: {} },
      instructions: "Use render_repo for HTML output and get_cxml for compact LLM-ready content.",
    });
  }

  if (method === "tools/list") {
    return result(id, toolsListPayload());
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      if (toolName === "render_repo") {
        return result(id, await toolRenderRepo(args));
      }
      if (toolName === "get_cxml") {
        return result(id, await toolGetCxml(args));
      }
      if (toolName === "health_check") {
        return result(id, await toolHealthCheck(args));
      }
      if (toolName === "list_outputs") {
        return result(id, await toolListOutputs(args));
      }
      if (toolName === "read_output") {
        return result(id, await toolReadOutput(args));
      }
      if (toolName === "cleanup_outputs") {
        return result(id, await toolCleanupOutputs(args));
      }
      throw new JsonRpcError(-32601, `Unknown tool: ${toolName}`);
    } catch (toolErr) {
      return result(id, {
        isError: true,
        ...makeTextAndStructured({ ok: false, tool: toolName, error: toolErr.message, data: toolErr.data || null }),
      });
    }
  }

  if (method === "ping") {
    return result(id, { ok: true, ts: Date.now() });
  }

  if (method === "notifications/initialized") {
    return null;
  }

  throw new JsonRpcError(-32601, `Method not found: ${method}`);
}

function writeFrame(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "utf8");
  process.stdout.write(header);
  process.stdout.write(body);
}

async function handleMessageObject(message) {
  if (!message || typeof message !== "object") {
    writeFrame(error(null, new JsonRpcError(-32600, "Invalid Request")));
    return;
  }

  if (message.id === undefined || message.id === null) {
    try {
      await handleRequest(message);
    } catch {
      return;
    }
    return;
  }

  try {
    const response = await handleRequest(message);
    if (response) {
      writeFrame(response);
    }
  } catch (err) {
    writeFrame(error(message.id, err));
  }
}

let buffered = Buffer.alloc(0);
let queue = Promise.resolve();

process.stdin.on("data", (chunk) => {
  buffered = Buffer.concat([buffered, chunk]);

  while (true) {
    const headerEnd = buffered.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      break;
    }

    const headerText = buffered.slice(0, headerEnd).toString("utf8");
    const headerLines = headerText.split("\r\n");
    const contentLengthHeader = headerLines.find((line) => line.toLowerCase().startsWith("content-length:"));
    if (!contentLengthHeader) {
      writeFrame(error(null, new JsonRpcError(-32700, "Missing Content-Length header")));
      buffered = Buffer.alloc(0);
      break;
    }

    const len = Number.parseInt(contentLengthHeader.split(":")[1].trim(), 10);
    if (!Number.isFinite(len) || len < 0) {
      writeFrame(error(null, new JsonRpcError(-32700, "Invalid Content-Length header")));
      buffered = Buffer.alloc(0);
      break;
    }

    const packetLen = headerEnd + 4 + len;
    if (buffered.length < packetLen) {
      break;
    }

    const jsonBody = buffered.slice(headerEnd + 4, packetLen).toString("utf8");
    buffered = buffered.slice(packetLen);

    const parsed = parseMaybeJson(jsonBody);
    if (!parsed) {
      writeFrame(error(null, new JsonRpcError(-32700, "Parse error")));
      continue;
    }

    queue = queue.then(() => handleMessageObject(parsed));
  }
});

process.stdin.on("error", () => {});
process.stdout.on("error", () => {
  setTimeout(() => process.exit(0), 10);
});

if (process.argv.includes("--version")) {
  process.stdout.write(`${SERVER_INFO.name} ${SERVER_INFO.version}\n`);
  process.exit(0);
}

if (process.env.EASYCOPY_MCP_SELFTEST === "1") {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, ".selftest"), `${Date.now()}\n`);
  sleep(10).then(() => process.exit(0));
}
