use crate::file_analyzer::FileInfo;
use anyhow::Result;
use std::fs;

/// Generate CXML format text for LLM consumption
pub fn generate_cxml(file_infos: &[FileInfo]) -> Result<String> {
    let mut lines = Vec::new();
    lines.push("<documents>".to_string());

    let rendered: Vec<_> = file_infos
        .iter()
        .filter(|f| f.decision.include)
        .collect();

    for (index, info) in rendered.iter().enumerate() {
        lines.push(format!("<document index=\"{}\">", index + 1));
        lines.push(format!("<source>{}</source>", info.rel));
        lines.push("<document_content>".to_string());

        match fs::read_to_string(&info.path) {
            Ok(content) => lines.push(content),
            Err(e) => lines.push(format!("Failed to read: {}", e)),
        }

        lines.push("</document_content>".to_string());
        lines.push("</document>".to_string());
    }

    lines.push("</documents>".to_string());
    Ok(lines.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_analyzer::RenderDecision;
    use std::path::PathBuf;

    #[test]
    fn test_generate_cxml() {
        let files = vec![
            FileInfo {
                path: PathBuf::from("test.txt"),
                rel: "test.txt".to_string(),
                size: 100,
                decision: RenderDecision {
                    include: true,
                    reason: "ok".to_string(),
                },
            },
        ];

        let cxml = generate_cxml(&files);
        assert!(cxml.is_ok());
        let content = cxml.unwrap();
        assert!(content.contains("<documents>"));
        assert!(content.contains("<source>test.txt</source>"));
        assert!(content.contains("</documents>"));
    }
}
