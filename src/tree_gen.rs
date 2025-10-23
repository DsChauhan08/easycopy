use anyhow::Result;
use std::fs;
use std::path::Path;
use std::process::Command;

/// Generate a tree-like directory structure
pub fn generate_tree(root: &Path) -> Result<String> {
    // Try to use the external 'tree' command first
    if let Ok(output) = try_tree_command(root) {
        return Ok(output);
    }

    // Fallback to our own implementation
    Ok(generate_tree_fallback(root))
}

/// Try to use the external 'tree' command
fn try_tree_command(root: &Path) -> Result<String> {
    let output = Command::new("tree")
        .arg("-a")
        .arg(".")
        .current_dir(root)
        .output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        anyhow::bail!("tree command failed")
    }
}

/// Fallback tree generation when 'tree' command is not available
fn generate_tree_fallback(root: &Path) -> String {
    let mut lines = Vec::new();
    
    let root_name = root.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "repo".to_string());
    
    lines.push(root_name);
    walk_dir(root, "", &mut lines);
    
    lines.join("\n")
}

/// Recursively walk directory and build tree lines
fn walk_dir(dir: &Path, prefix: &str, lines: &mut Vec<String>) {
    let mut entries: Vec<_> = match fs::read_dir(dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                // Skip .git directory
                e.file_name() != ".git"
            })
            .collect(),
        Err(_) => return,
    };

    // Sort: directories first, then by name
    entries.sort_by(|a, b| {
        let a_is_dir = a.path().is_dir();
        let b_is_dir = b.path().is_dir();
        
        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for (i, entry) in entries.iter().enumerate() {
        let is_last = i == entries.len() - 1;
        let branch = if is_last { "└── " } else { "├── " };
        let name = entry.file_name().to_string_lossy().to_string();
        
        lines.push(format!("{}{}{}", prefix, branch, name));
        
        if entry.path().is_dir() {
            let extension = if is_last { "    " } else { "│   " };
            walk_dir(&entry.path(), &format!("{}{}", prefix, extension), lines);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_generate_tree_fallback() {
        let temp_dir = TempDir::new().unwrap();
        let root = temp_dir.path();
        
        // Create some test structure
        fs::create_dir(root.join("src")).unwrap();
        fs::write(root.join("src/main.rs"), "").unwrap();
        fs::write(root.join("README.md"), "").unwrap();
        
        let tree = generate_tree_fallback(root);
        assert!(tree.contains("src"));
        assert!(tree.contains("README.md"));
    }
}
