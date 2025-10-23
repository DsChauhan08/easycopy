use crate::cxml_gen;
use crate::file_analyzer::{FileInfo, MARKDOWN_EXTENSIONS};
use crate::tree_gen;
use crate::utils::{bytes_human, html_escape, slugify};
use anyhow::Result;
use pulldown_cmark::{html, Parser};
use std::fs;
use std::path::Path;
use syntect::easy::HighlightLines;
use syntect::highlighting::ThemeSet;
use syntect::html::{styled_line_to_highlighted_html, IncludeBackground};
use syntect::parsing::SyntaxSet;
use syntect::util::LinesWithEndings;

/// Build the complete HTML output
pub fn build_html(
    repo_url: &str,
    repo_dir: &Path,
    head_commit: &str,
    file_infos: &[FileInfo],
) -> Result<String> {
    // Load syntax highlighting assets
    let syntax_set = SyntaxSet::load_defaults_newlines();
    let theme_set = ThemeSet::load_defaults();
    let theme = &theme_set.themes["InspiredGitHub"];

    // Generate CSS for syntax highlighting
    let css = generate_css();

    // Statistics
    let rendered: Vec<_> = file_infos.iter().filter(|f| f.decision.include).collect();
    let skipped_binary: Vec<_> = file_infos
        .iter()
        .filter(|f| f.decision.reason == "binary")
        .collect();
    let skipped_large: Vec<_> = file_infos
        .iter()
        .filter(|f| f.decision.reason == "too_large")
        .collect();
    let skipped_ignored: Vec<_> = file_infos
        .iter()
        .filter(|f| f.decision.reason == "ignored")
        .collect();
    let total_files = rendered.len() + skipped_binary.len() + skipped_large.len() + skipped_ignored.len();

    // Generate directory tree
    let tree_text = tree_gen::generate_tree(repo_dir)?;

    // Generate CXML for LLM view
    let cxml_text = cxml_gen::generate_cxml(file_infos)?;

    // Build table of contents
    let mut toc_items = Vec::new();
    for info in &rendered {
        let anchor = slugify(&info.rel);
        toc_items.push(format!(
            "<li><a href=\"#file-{}\">{}</a> <span class=\"muted\">({})</span></li>",
            anchor,
            html_escape(&info.rel),
            bytes_human(info.size)
        ));
    }
    let toc_html = toc_items.join("\n");

    // Build file sections
    let mut sections = Vec::new();
    for info in &rendered {
        let anchor = slugify(&info.rel);
        let content = fs::read_to_string(&info.path)?;

        let body_html = if is_markdown(&info.rel) {
            render_markdown(&content)
        } else {
            highlight_code(&content, &info.rel, &syntax_set, theme)?
        };

        sections.push(format!(
            r##"
<section class="file-section" id="file-{anchor}">
  <h2>{rel_escaped} <span class="muted">({size})</span></h2>
  <div class="file-body">{body}</div>
  <div class="back-top"><a href="#top">↑ Back to top</a></div>
</section>
"##,
            anchor = anchor,
            rel_escaped = html_escape(&info.rel),
            size = bytes_human(info.size),
            body = body_html
        ));
    }
    let sections_html = sections.join("\n");

    // Build skip lists
    let skipped_html = format!(
        "{}{}",
        render_skip_list("Skipped binaries", &skipped_binary),
        render_skip_list("Skipped large files", &skipped_large)
    );

    // Build final HTML
    Ok(format!(
        r##"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Flattened repo – {repo_url_escaped}</title>
<style>
{css}
</style>
</head>
<body>
<a id="top"></a>

<div class="page">
  <nav id="sidebar"><div class="sidebar-inner">
      <h2>Contents ({rendered_count})</h2>
      <ul class="toc toc-sidebar">
        <li><a href="#top">↑ Back to top</a></li>
        {toc_html}
      </ul>
  </div></nav>

  <main class="container">

    <section>
        <div class="meta">
        <div><strong>Repository:</strong> <a href="{repo_url_escaped}">{repo_url_escaped}</a></div>
        <small><strong>HEAD commit:</strong> {head_commit_escaped}</small>
        <div class="counts">
            <strong>Total files:</strong> {total_files} · <strong>Rendered:</strong> {rendered_count} · <strong>Skipped:</strong> {skipped_count}
        </div>
        </div>
    </section>

    <div class="view-toggle">
      <strong>View:</strong>
      <button class="toggle-btn active" onclick="showHumanView()">👤 Human</button>
      <button class="toggle-btn" onclick="showLLMView()">🤖 LLM</button>
    </div>

    <div id="human-view">
      <section>
        <h2>Directory tree</h2>
        <pre>{tree_text_escaped}</pre>
      </section>

      <section class="toc-top">
        <h2>Table of contents ({rendered_count})</h2>
        <ul class="toc">{toc_html}</ul>
      </section>

      <section>
        <h2>Skipped items</h2>
        {skipped_html}
      </section>

      {sections_html}
    </div>

    <div id="llm-view">
      <section>
        <h2>🤖 LLM View - CXML Format</h2>
        <p>Copy the text below and paste it to an LLM for analysis:</p>
        <textarea id="llm-text" readonly>{cxml_text_escaped}</textarea>
        <div class="copy-hint">
          💡 <strong>Tip:</strong> Click in the text area and press Ctrl+A (Cmd+A on Mac) to select all, then Ctrl+C (Cmd+C) to copy.
        </div>
      </section>
    </div>
  </main>
</div>

<script>
{javascript}
</script>
</body>
</html>
"##,
        repo_url_escaped = html_escape(repo_url),
        head_commit_escaped = html_escape(head_commit),
        total_files = total_files,
        rendered_count = rendered.len(),
        skipped_count = skipped_binary.len() + skipped_large.len() + skipped_ignored.len(),
        toc_html = toc_html,
        tree_text_escaped = html_escape(&tree_text),
        skipped_html = skipped_html,
        sections_html = sections_html,
        cxml_text_escaped = html_escape(&cxml_text),
        css = css,
        javascript = get_javascript(),
    ))
}

/// Check if a file is markdown based on extension
fn is_markdown(filename: &str) -> bool {
    MARKDOWN_EXTENSIONS
        .iter()
        .any(|ext| filename.to_lowercase().ends_with(ext))
}

/// Render markdown to HTML
fn render_markdown(content: &str) -> String {
    let parser = Parser::new(content);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

/// Highlight code using syntect
fn highlight_code(
    content: &str,
    filename: &str,
    syntax_set: &SyntaxSet,
    theme: &syntect::highlighting::Theme,
) -> Result<String> {
    let syntax = syntax_set
        .find_syntax_by_extension(
            Path::new(filename)
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("txt"),
        )
        .unwrap_or_else(|| syntax_set.find_syntax_plain_text());

    let mut html = String::from("<div class=\"highlight\"><pre>");
    let mut highlighter = HighlightLines::new(syntax, theme);

    for line in LinesWithEndings::from(content) {
        let ranges = highlighter.highlight_line(line, syntax_set)?;
        let escaped = styled_line_to_highlighted_html(&ranges[..], IncludeBackground::No)?;
        html.push_str(&escaped);
    }

    html.push_str("</pre></div>");
    Ok(html)
}

/// Render a skip list section
fn render_skip_list(title: &str, items: &[&FileInfo]) -> String {
    if items.is_empty() {
        return String::new();
    }

    let mut lis = Vec::new();
    for info in items {
        lis.push(format!(
            "<li><code>{}</code> <span class='muted'>({})</span></li>",
            html_escape(&info.rel),
            bytes_human(info.size)
        ));
    }

    format!(
        "<details open><summary>{} ({})</summary><ul class='skip-list'>\n{}\n</ul></details>",
        html_escape(title),
        items.len(),
        lis.join("\n")
    )
}

/// Generate CSS styles
fn generate_css() -> &'static str {
    r#"
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji';
    margin: 0; padding: 0; line-height: 1.45;
  }
  .container { max-width: 1100px; margin: 0 auto; padding: 0 1rem; }
  .meta small { color: #666; }
  .counts { margin-top: 0.25rem; color: #333; }
  .muted { color: #777; font-weight: normal; font-size: 0.9em; }

  /* Layout with sidebar */
  .page { display: grid; grid-template-columns: 320px minmax(0,1fr); gap: 0; }
  #sidebar {
    position: sticky; top: 0; align-self: start;
    height: 100vh; overflow: auto;
    border-right: 1px solid #eee; background: #fafbfc;
  }
  #sidebar .sidebar-inner { padding: 0.75rem; }
  #sidebar h2 { margin: 0 0 0.5rem 0; font-size: 1rem; }

  .toc { list-style: none; padding-left: 0; margin: 0; overflow-x: auto; }
  .toc li { padding: 0.15rem 0; white-space: nowrap; }
  .toc a { text-decoration: none; color: #0366d6; display: inline-block; text-decoration: none; }
  .toc a:hover { text-decoration: underline; }

  main.container { padding-top: 1rem; }

  pre { background: #f6f8fa; padding: 0.75rem; overflow: auto; border-radius: 6px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace; }
  .highlight { overflow-x: auto; }
  .file-section { padding: 1rem; border-top: 1px solid #eee; }
  .file-section h2 { margin: 0 0 0.5rem 0; font-size: 1.1rem; }
  .file-body { margin-bottom: 0.5rem; }
  .back-top { font-size: 0.9rem; }
  .skip-list code { background: #f6f8fa; padding: 0.1rem 0.3rem; border-radius: 4px; }
  .error { color: #b00020; background: #fff3f3; }

  /* Hide duplicate top TOC on wide screens */
  .toc-top { display: block; }
  @media (min-width: 1000px) { .toc-top { display: none; } }

  :target { scroll-margin-top: 8px; }

  /* View toggle */
  .view-toggle {
    margin: 1rem 0;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .toggle-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d9e0;
    background: white;
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  .toggle-btn.active {
    background: #0366d6;
    color: white;
    border-color: #0366d6;
  }
  .toggle-btn:hover:not(.active) {
    background: #f6f8fa;
  }

  /* LLM view */
  #llm-view { display: none; }
  #llm-text {
    width: 100%;
    height: 70vh;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.85em;
    border: 1px solid #d1d9e0;
    border-radius: 6px;
    padding: 1rem;
    resize: vertical;
  }
  .copy-hint {
    margin-top: 0.5rem;
    color: #666;
    font-size: 0.9em;
  }

  /* Syntax highlighting */
  .highlight pre {
    margin: 0;
    background: #f6f8fa;
  }
"#
}

/// Get JavaScript code for view toggling
fn get_javascript() -> &'static str {
    r#"
function showHumanView() {
  document.getElementById('human-view').style.display = 'block';
  document.getElementById('llm-view').style.display = 'none';
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

function showLLMView() {
  document.getElementById('human-view').style.display = 'none';
  document.getElementById('llm-view').style.display = 'block';
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  // Auto-select all text when switching to LLM view for easy copying
  setTimeout(() => {
    const textArea = document.getElementById('llm-text');
    textArea.focus();
    textArea.select();
  }, 100);
}
"#
}
