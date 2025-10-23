use anyhow::{Context, Result};
use git2::Repository;
use std::path::Path;

/// Clone a repository to the specified destination
pub fn clone_repo(url: &str, dest: &Path) -> Result<()> {
    Repository::clone(url, dest)
        .context("Failed to clone repository")?;
    Ok(())
}

/// Get the HEAD commit hash of a repository
pub fn get_head_commit(repo_path: &Path) -> Result<String> {
    let repo = Repository::open(repo_path)
        .context("Failed to open repository")?;
    
    let head = repo.head()
        .context("Failed to get HEAD reference")?;
    
    let commit = head.peel_to_commit()
        .context("Failed to peel HEAD to commit")?;
    
    Ok(commit.id().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    #[ignore] // Requires network access
    fn test_clone_repo() {
        let temp_dir = TempDir::new().unwrap();
        let dest = temp_dir.path().join("test_repo");
        
        // This would require a real repo URL
        // clone_repo("https://github.com/some/small-repo", &dest).unwrap();
        // assert!(dest.exists());
    }
}
