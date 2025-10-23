mod file_analyzer;
mod git_ops;
mod html_builder;
mod tree_gen;
mod cxml_gen;
mod utils;

use anyhow::{Context, Result};
use clap::Parser;
use std::path::PathBuf;
use tempfile::TempDir;

/// Flatten a GitHub repo into a single static HTML page for fast skimming and search
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// GitHub repository URL (https://github.com/owner/repo[.git])
    repo_url: String,

    /// Output HTML file path (default: temporary file derived from repo name)
    #[arg(short, long)]
    out: Option<PathBuf>,

    /// Maximum file size to render in bytes (larger files are listed but skipped)
    #[arg(long, default_value_t = 50 * 1024)]
    max_bytes: usize,

    /// Don't open the HTML file in browser after generation
    #[arg(long)]
    no_open: bool,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Determine output path
    let output_path = args.out.unwrap_or_else(|| {
        utils::derive_temp_output_path(&args.repo_url)
    });

    // Create temporary directory for cloning
    let temp_dir = TempDir::new().context("Failed to create temporary directory")?;
    let repo_dir = temp_dir.path().join("repo");

    eprintln!("📁 Cloning {} to temporary directory: {}", args.repo_url, repo_dir.display());
    git_ops::clone_repo(&args.repo_url, &repo_dir)
        .context("Failed to clone repository")?;

    let head_commit = git_ops::get_head_commit(&repo_dir)
        .unwrap_or_else(|_| "(unknown)".to_string());
    eprintln!("✓ Clone complete (HEAD: {})", &head_commit[..8.min(head_commit.len())]);

    eprintln!("📊 Scanning files in {}...", repo_dir.display());
    let file_infos = file_analyzer::collect_files(&repo_dir, args.max_bytes)
        .context("Failed to collect files")?;

    let rendered_count = file_infos.iter().filter(|f| f.decision.include).count();
    let skipped_count = file_infos.len() - rendered_count;
    eprintln!("✓ Found {} files total ({} will be rendered, {} skipped)",
              file_infos.len(), rendered_count, skipped_count);

    eprintln!("🔨 Generating HTML...");
    let html_content = html_builder::build_html(
        &args.repo_url,
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

    eprintln!("🗑️  Cleaning up temporary directory: {}", temp_dir.path().display());
    // temp_dir is automatically cleaned up when it goes out of scope

    Ok(())
}
