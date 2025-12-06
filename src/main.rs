mod file_analyzer;
mod git_ops;
mod html_builder;
mod tree_gen;
mod cxml_gen;
mod utils;

use anyhow::{Context, Result};
use clap::Parser;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

enum RepoSource {
    Local(PathBuf),
    Remote(String),
}

fn detect_source(input: &str) -> RepoSource {
    let path = Path::new(input);
    
    // Check if it's a local path that exists
    if path.exists() && path.is_dir() {
        RepoSource::Local(path.to_path_buf())
    } else if input.starts_with("http://") || input.starts_with("https://") || input.starts_with("git@") {
        RepoSource::Remote(input.to_string())
    } else {
        // Try as local path first, even if it doesn't exist yet
        RepoSource::Local(PathBuf::from(input))
    }
}

/// Flatten a GitHub repo into a single static HTML page for fast skimming and search
#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Flatten a GitHub repo into a single static HTML page",
    long_about = "A Rust implementation of rendergit that flattens any GitHub repository or local directory into a single, static HTML page with syntax highlighting, markdown rendering, and sidebar navigation. Perfect for code review, exploration, and an instant Ctrl+F experience."
)]
struct Args {
    /// GitHub repository URL (https://github.com/owner/repo[.git]) or local directory path
    repo_url_or_path: String,

    /// Output HTML file path (default: temporary file derived from repo name)
    #[arg(short, long)]
    out: Option<PathBuf>,

    /// Maximum file size to render in bytes (larger files are listed but skipped)
    #[arg(long, default_value_t = 50 * 1024)]
    max_bytes: usize,

    /// Don't open the HTML file in browser after generation
    #[arg(long)]
    no_open: bool,

    /// Clone a specific branch instead of default branch
    #[arg(short, long)]
    branch: Option<String>,

    /// Clone a specific tag instead of default branch
    #[arg(short, long)]
    tag: Option<String>,

    /// Checkout a specific commit hash
    #[arg(short, long)]
    commit: Option<String>,

    /// Disable progress indicators (useful for piping output)
    #[arg(long)]
    no_progress: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Validate conflicting options
    let ref_count = [args.branch.is_some(), args.tag.is_some(), args.commit.is_some()]
        .iter()
        .filter(|&&x| x)
        .count();
    
    if ref_count > 1 {
        anyhow::bail!("Cannot specify more than one of --branch, --tag, or --commit");
    }

    // Detect if input is local or remote
    let source = detect_source(&args.repo_url_or_path);
    
    let (repo_dir, temp_dir, repo_name) = match source {
        RepoSource::Local(path) => {
            if !path.exists() {
                anyhow::bail!("Local directory does not exist: {}", path.display());
            }
            if !path.is_dir() {
                anyhow::bail!("Path is not a directory: {}", path.display());
            }
            
            eprintln!("📂 Using local directory: {}", path.display());
            let name = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("local")
                .to_string();
            (path.clone(), None, name)
        }
        RepoSource::Remote(url) => {
            // Determine git reference to use
            let git_ref = if let Some(branch) = &args.branch {
                git_ops::GitRef::Branch(branch.clone())
            } else if let Some(tag) = &args.tag {
                git_ops::GitRef::Tag(tag.clone())
            } else if let Some(commit) = &args.commit {
                git_ops::GitRef::Commit(commit.clone())
            } else {
                git_ops::GitRef::Default
            };

            let ref_desc = match &git_ref {
                git_ops::GitRef::Branch(b) => format!(" (branch: {})", b),
                git_ops::GitRef::Tag(t) => format!(" (tag: {})", t),
                git_ops::GitRef::Commit(c) => format!(" (commit: {})", &c[..8.min(c.len())]),
                git_ops::GitRef::Default => String::new(),
            };

            // Create temporary directory for cloning
            let temp = TempDir::new().context("Failed to create temporary directory")?;
            let repo_path = temp.path().join("repo");

            eprintln!("📁 Cloning {}{} to temporary directory: {}", url, ref_desc, repo_path.display());
            git_ops::clone_repo(&url, &repo_path, &git_ref)
                .context("Failed to clone repository")?;

            let name = utils::derive_repo_name(&url);
            (repo_path, Some(temp), name)
        }
    };

    // Determine output path
    let output_path = args.out.unwrap_or_else(|| {
        let filename = format!("{}.html", repo_name);
        std::env::temp_dir().join(filename)
    });

    let head_commit = git_ops::get_head_commit(&repo_dir)
        .unwrap_or_else(|_| "(unknown)".to_string());
    eprintln!("✓ Repository ready (HEAD: {})", &head_commit[..8.min(head_commit.len())]);

    eprintln!("📊 Scanning files in {}...", repo_dir.display());
    let file_infos = file_analyzer::collect_files(&repo_dir, args.max_bytes, !args.no_progress)
        .context("Failed to collect files")?;

    let rendered_count = file_infos.iter().filter(|f| f.decision.include).count();
    let skipped_count = file_infos.len() - rendered_count;
    eprintln!("✓ Found {} files total ({} will be rendered, {} skipped)",
              file_infos.len(), rendered_count, skipped_count);

    eprintln!("🔨 Generating HTML...");
    let html_content = html_builder::build_html(
        &args.repo_url_or_path,
        &repo_dir,
        &head_commit,
        &file_infos,
    ).context("Failed to build HTML")?;

    eprintln!("💾 Writing HTML file: {}", output_path.display());
    std::fs::write(&output_path, html_content)
        .context("Failed to write HTML file")?;

    let file_size = std::fs::metadata(&output_path)?.len();
    eprintln!("✓ Wrote {} to {}", utils::bytes_human(file_size), output_path.display());

    if !args.no_open {
        eprintln!("🌐 Opening {} in browser...", output_path.display());
        opener::open(&output_path).ok();
    }

    if let Some(temp) = temp_dir {
        eprintln!("🗑️  Cleaning up temporary directory: {}", temp.path().display());
    }

    Ok(())
}
