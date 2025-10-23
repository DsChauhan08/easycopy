# Project Structure

```
easycopy/
├── Cargo.toml              # Rust package manifest with dependencies
├── Cargo.lock              # Locked dependency versions
├── LICENSE                 # BSD Zero Clause License
├── README.md               # Main documentation
├── QUICKSTART.md           # Quick installation and usage guide
├── COMPARISON.md           # Comparison with original rendergit
├── .gitignore              # Git ignore rules
│
├── src/
│   ├── main.rs             # Entry point, CLI argument parsing, main flow
│   ├── file_analyzer.rs    # File scanning, binary detection, filtering
│   ├── git_ops.rs          # Git operations (clone, HEAD commit)
│   ├── tree_gen.rs         # Directory tree generation
│   ├── cxml_gen.rs         # CXML format generation for LLM view
│   ├── html_builder.rs     # HTML generation with syntax highlighting
│   └── utils.rs            # Utility functions (bytes formatting, slugify, etc.)
│
└── target/
    └── release/
        └── easycopy        # Compiled binary (3.5 MB)
```

## Module Breakdown

### `main.rs` (90 lines)
- CLI argument parsing using `clap`
- Orchestrates the entire workflow
- Error handling and user feedback
- Browser opening using `opener`

### `file_analyzer.rs` (180 lines)
- `FileInfo` and `RenderDecision` structs
- Binary file detection (extension + content analysis)
- Recursive file collection
- File filtering logic (size, binary, .git exclusion)

### `git_ops.rs` (45 lines)
- Git clone using `git2-rs`
- HEAD commit hash retrieval
- Cross-platform git operations

### `tree_gen.rs` (110 lines)
- Fallback tree generation (pure Rust)
- Optional external `tree` command
- Alphabetically sorted with folders first

### `cxml_gen.rs` (55 lines)
- CXML format generation for LLM consumption
- Simple XML-like structure
- File content with proper escaping

### `html_builder.rs` (350 lines)
- Complete HTML page generation
- Syntax highlighting using `syntect`
- Markdown rendering using `pulldown-cmark`
- Embedded CSS and JavaScript
- Dual view (Human/LLM) support
- Table of contents generation
- Skip list rendering

### `utils.rs` (85 lines)
- Human-readable byte formatting
- Output path derivation from URL
- Slugify for HTML anchors
- HTML escaping

## Dependencies

### Core Functionality
- `git2` - Git operations (libgit2 binding)
- `clap` - Command-line argument parsing
- `anyhow` - Error handling
- `tempfile` - Temporary directory management

### Content Processing
- `syntect` - Syntax highlighting
- `pulldown-cmark` - Markdown rendering
- `html-escape` - HTML entity escaping

### Utilities
- `opener` - Cross-platform browser opening
- `infer` - File type detection (magic bytes)
- `pathdiff` - Path manipulation

## Key Features

### Cross-Platform Support
- Pure Rust implementation
- Works on Windows, Linux, macOS, Android (Termux)
- Handles path separators correctly
- Uses native git library (no subprocess calls)

### Performance
- Fast syntax highlighting with syntect
- Efficient file scanning
- Minimal memory allocations
- Optimized release build with LTO

### User Experience
- Clear progress indicators (emojis + text)
- Automatic browser opening (optional)
- Smart default output path
- Comprehensive error messages

### Code Quality
- Type-safe with Rust's type system
- Comprehensive error handling
- Unit tests for critical functions
- Well-documented modules

## Build Configuration

The `Cargo.toml` includes release optimizations:
```toml
[profile.release]
opt-level = 3           # Maximum optimization
lto = true              # Link-time optimization
codegen-units = 1       # Single codegen unit for better optimization
strip = true            # Strip debug symbols
```

Result: 3.5 MB standalone binary

## Testing

6 unit tests covering:
- Byte formatting
- URL path derivation
- Slugify function
- Binary file detection
- CXML generation
- Tree generation

Run with: `cargo test`

## Future Enhancements

Potential improvements:
1. Progress bars for large repos
2. Parallel file processing
3. Custom theme support
4. Private repository support (SSH/tokens)
5. Incremental rendering (cache)
6. PDF export option
7. Configuration file support
8. Plugin system for custom processors
