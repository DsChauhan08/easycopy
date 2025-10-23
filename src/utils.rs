use std::path::PathBuf;

/// Convert bytes to human-readable format
pub fn bytes_human(n: u64) -> String {
    const UNITS: &[&str] = &["B", "KiB", "MiB", "GiB", "TiB"];
    let mut size = n as f64;
    let mut unit_idx = 0;

    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }

    if unit_idx == 0 {
        format!("{} {}", size as u64, UNITS[unit_idx])
    } else {
        format!("{:.1} {}", size, UNITS[unit_idx])
    }
}

/// Derive a temporary output path from the repo URL
pub fn derive_temp_output_path(repo_url: &str) -> PathBuf {
    let parts: Vec<&str> = repo_url.trim_end_matches('/').split('/').collect();
    let repo_name = if parts.len() >= 2 {
        let mut name = parts[parts.len() - 1];
        if name.ends_with(".git") {
            name = &name[..name.len() - 4];
        }
        name
    } else {
        "repo"
    };

    let filename = format!("{}.html", repo_name);
    std::env::temp_dir().join(filename)
}

/// Simple slugify for creating HTML anchors
pub fn slugify(path_str: &str) -> String {
    path_str
        .chars()
        .map(|ch| {
            if ch.is_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect()
}

/// HTML escape a string
pub fn html_escape(s: &str) -> String {
    html_escape::encode_text(s).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bytes_human() {
        assert_eq!(bytes_human(512), "512 B");
        assert_eq!(bytes_human(1024), "1.0 KiB");
        assert_eq!(bytes_human(1536), "1.5 KiB");
        assert_eq!(bytes_human(1048576), "1.0 MiB");
    }

    #[test]
    fn test_derive_temp_output_path() {
        let path = derive_temp_output_path("https://github.com/owner/repo");
        assert!(path.to_string_lossy().contains("repo.html"));

        let path = derive_temp_output_path("https://github.com/owner/repo.git");
        assert!(path.to_string_lossy().contains("repo.html"));
    }

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("src/main.rs"), "src-main-rs");
        assert_eq!(slugify("README.md"), "README-md");
    }
}
