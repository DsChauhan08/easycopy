use anyhow::{Context, Result};
use git2::{Repository, build::RepoBuilder};
use std::path::Path;

#[derive(Debug, Clone)]
pub enum GitRef {
    Branch(String),
    Tag(String),
    Commit(String),
    Default,
}

/// Clone a repository to the specified destination with optional ref specification
pub fn clone_repo(url: &str, dest: &Path, git_ref: &GitRef) -> Result<()> {
    match git_ref {
        GitRef::Default => {
            // Simple clone
            Repository::clone(url, dest)
                .context("Failed to clone repository")?;
        }
        GitRef::Branch(branch) => {
            // Clone specific branch
            let mut builder = RepoBuilder::new();
            builder.branch(branch);
            builder.clone(url, dest)
                .with_context(|| format!("Failed to clone repository with branch '{}'", branch))?;
        }
        GitRef::Tag(tag) => {
            // For tags, we need to clone then checkout
            let repo = Repository::clone(url, dest)
                .context("Failed to clone repository")?;
            
            let reference = format!("refs/tags/{}", tag);
            
            // Find and checkout the specific reference
            let (object, reference_obj) = repo.revparse_ext(&reference)
                .with_context(|| format!("Failed to find tag '{}'", tag))?;
            
            repo.checkout_tree(&object, None)
                .context("Failed to checkout tree")?;
            
            match reference_obj {
                Some(gref) => repo.set_head(gref.name().unwrap()),
                None => repo.set_head_detached(object.id()),
            }.context("Failed to set HEAD")?;
        }
        GitRef::Commit(commit_hash) => {
            // For commits, clone then checkout
            let repo = Repository::clone(url, dest)
                .context("Failed to clone repository")?;
            
            // Find and checkout the specific commit
            let (object, reference_obj) = repo.revparse_ext(commit_hash)
                .with_context(|| format!("Failed to find commit '{}'", commit_hash))?;
            
            repo.checkout_tree(&object, None)
                .context("Failed to checkout tree")?;
            
            match reference_obj {
                Some(gref) => repo.set_head(gref.name().unwrap()),
                None => repo.set_head_detached(object.id()),
            }.context("Failed to set HEAD")?;
        }
    }
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
