use anyhow::{Context, Result};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

const BINARY_EXTENSIONS: &[&str] = &[
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico",
    ".pdf", ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
    ".mp3", ".mp4", ".mov", ".avi", ".mkv", ".wav", ".ogg", ".flac",
    ".ttf", ".otf", ".eot", ".woff", ".woff2",
    ".so", ".dll", ".dylib", ".class", ".jar", ".exe", ".bin",
];

pub const MARKDOWN_EXTENSIONS: &[&str] = &[".md", ".markdown", ".mdown", ".mkd", ".mkdn"];

#[derive(Debug, Clone)]
pub struct RenderDecision {
    pub include: bool,
    pub reason: String, // "ok" | "binary" | "too_large" | "ignored"
}

#[derive(Debug, Clone)]
pub struct FileInfo {
    pub path: PathBuf,      // absolute path on disk
    pub rel: String,        // path relative to repo root (slash-separated)
    pub size: u64,
    pub decision: RenderDecision,
}

/// Check if a file looks binary based on extension or content
fn looks_binary(path: &Path) -> bool {
    // Check extension first
    if let Some(ext) = path.extension() {
        let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
        if BINARY_EXTENSIONS.contains(&ext_str.as_str()) {
            return true;
        }
    }

    // Check file content using infer crate (magic bytes)
    if let Ok(mut file) = fs::File::open(path) {
        let mut buffer = vec![0; 8192];
        if let Ok(n) = file.read(&mut buffer) {
            buffer.truncate(n);
            
            // Check for null bytes
            if buffer.contains(&0) {
                return true;
            }

            // Try to decode as UTF-8
            if std::str::from_utf8(&buffer).is_err() {
                return true;
            }
        }
    }

    false
}

/// Decide whether to render a file
fn decide_file(path: &Path, repo_root: &Path, max_bytes: usize) -> Result<FileInfo> {
    let rel = path
        .strip_prefix(repo_root)
        .context("Failed to get relative path")?
        .to_string_lossy()
        .replace('\\', "/");

    let size = fs::metadata(path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Ignore VCS directories
    if rel.starts_with(".git/") || rel.contains("/.git/") {
        return Ok(FileInfo {
            path: path.to_path_buf(),
            rel,
            size,
            decision: RenderDecision {
                include: false,
                reason: "ignored".to_string(),
            },
        });
    }

    // Check size
    if size > max_bytes as u64 {
        return Ok(FileInfo {
            path: path.to_path_buf(),
            rel,
            size,
            decision: RenderDecision {
                include: false,
                reason: "too_large".to_string(),
            },
        });
    }

    // Check if binary
    if looks_binary(path) {
        return Ok(FileInfo {
            path: path.to_path_buf(),
            rel,
            size,
            decision: RenderDecision {
                include: false,
                reason: "binary".to_string(),
            },
        });
    }

    Ok(FileInfo {
        path: path.to_path_buf(),
        rel,
        size,
        decision: RenderDecision {
            include: true,
            reason: "ok".to_string(),
        },
    })
}

/// Recursively collect all files in a repository
pub fn collect_files(repo_root: &Path, max_bytes: usize) -> Result<Vec<FileInfo>> {
    let mut infos = Vec::new();

    fn visit_dirs(dir: &Path, repo_root: &Path, max_bytes: usize, infos: &mut Vec<FileInfo>) -> Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                // Skip symlinks
                if path.is_symlink() {
                    continue;
                }

                if path.is_dir() {
                    // Skip .git directory entirely
                    if path.file_name().map(|n| n == ".git").unwrap_or(false) {
                        continue;
                    }
                    visit_dirs(&path, repo_root, max_bytes, infos)?;
                } else if path.is_file() {
                    if let Ok(info) = decide_file(&path, repo_root, max_bytes) {
                        infos.push(info);
                    }
                }
            }
        }
        Ok(())
    }

    visit_dirs(repo_root, repo_root, max_bytes, &mut infos)?;
    
    // Sort by relative path for consistent output
    infos.sort_by(|a, b| a.rel.cmp(&b.rel));
    
    Ok(infos)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_looks_binary() {
        // This is a simple test - in practice would need actual files
        assert!(BINARY_EXTENSIONS.contains(&".png"));
        assert!(BINARY_EXTENSIONS.contains(&".exe"));
    }
}
