use anyhow::{Context, Result};
use indicatif::{ProgressBar, ProgressStyle};
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
pub fn collect_files(repo_root: &Path, max_bytes: usize, show_progress: bool) -> Result<Vec<FileInfo>> {
    let mut infos = Vec::new();

    // First pass: count total files for progress bar
    let total_files = if show_progress {
        count_files(repo_root)?
    } else {
        0
    };

    let progress = if show_progress && total_files > 0 {
        let pb = ProgressBar::new(total_files as u64);
        pb.set_style(
            ProgressStyle::default_bar()
                .template("{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} files ({msg})")
                .unwrap()
                .progress_chars("#>-")
        );
        Some(pb)
    } else {
        None
    };

    fn visit_dirs(
        dir: &Path,
        repo_root: &Path,
        max_bytes: usize,
        infos: &mut Vec<FileInfo>,
        progress: &Option<ProgressBar>,
    ) -> Result<()> {
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
                    visit_dirs(&path, repo_root, max_bytes, infos, progress)?;
                } else if path.is_file() {
                    if let Ok(info) = decide_file(&path, repo_root, max_bytes) {
                        if let Some(pb) = progress {
                            pb.inc(1);
                            let rel = info.rel.clone();
                            let short_name = if rel.len() > 50 {
                                format!("...{}", &rel[rel.len()-47..])
                            } else {
                                rel
                            };
                            pb.set_message(short_name);
                        }
                        infos.push(info);
                    }
                }
            }
        }
        Ok(())
    }

    visit_dirs(repo_root, repo_root, max_bytes, &mut infos, &progress)?;
    
    if let Some(pb) = progress {
        pb.finish_with_message("Complete");
    }
    
    // Sort by relative path for consistent output
    infos.sort_by(|a, b| a.rel.cmp(&b.rel));
    
    Ok(infos)
}

/// Count total files in directory (for progress bar)
fn count_files(dir: &Path) -> Result<usize> {
    let mut count = 0;
    
    fn count_recursive(dir: &Path, count: &mut usize) -> Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                
                if path.is_symlink() {
                    continue;
                }
                
                if path.is_dir() {
                    if path.file_name().map(|n| n == ".git").unwrap_or(false) {
                        continue;
                    }
                    count_recursive(&path, count)?;
                } else if path.is_file() {
                    *count += 1;
                }
            }
        }
        Ok(())
    }
    
    count_recursive(dir, &mut count)?;
    Ok(count)
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
