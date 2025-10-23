# easycopy

> Just show me the code.

A Rust implementation of [rendergit](https://github.com/karpathy/rendergit) that works on Windows, Linux, and Android (Termux). Flatten any GitHub repository into a single, static HTML page with syntax highlighting, markdown rendering, and a clean sidebar navigation. Perfect for code review, exploration, and an instant Ctrl+F experience.

## Features

- **Cross-platform**: Works on Windows, Linux, and Android (Termux)
- **Dual view modes** - toggle between Human and LLM views
  - **👤 Human View**: Pretty interface with syntax highlighting and navigation
  - **🤖 LLM View**: Raw CXML text format - perfect for copying to Claude/ChatGPT for code analysis
- **Syntax highlighting** for code files via syntect
- **Markdown rendering** for README files and docs
- **Smart filtering** - skips binaries and oversized files
- **Directory tree** overview at the top
- **Sidebar navigation** with file links and sizes
- **Responsive design** that works on mobile
- **Search-friendly** - use Ctrl+F to find anything across all files
- **Fast and efficient** - written in Rust with optimized binaries

## Installation

### Prerequisites

You need to have Rust installed. If you don't have it:

**Linux/macOS:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Windows:**
Download and run [rustup-init.exe](https://rustup.rs/)

**Android (Termux):**
```bash
pkg install rust
```

### Build from source

```bash
git clone https://github.com/DsChauhan08/easycopy
cd easycopy
cargo build --release
```

The binary will be at `target/release/easycopy` (or `easycopy.exe` on Windows).

### Install to system

```bash
cargo install --path .
```

This installs `easycopy` to your cargo bin directory (usually `~/.cargo/bin`), which should be in your PATH.

## Usage

### Basic usage

```bash
easycopy https://github.com/username/repository
```

This will:
1. Clone the repo to a temporary directory
2. Render its source code into a single static HTML file
3. Automatically open the file in your browser

### Advanced options

```bash
# Specify output location
easycopy https://github.com/username/repository -o output.html

# Don't open in browser
easycopy https://github.com/username/repository --no-open

# Set maximum file size (in bytes) to render
easycopy https://github.com/username/repository --max-bytes 100000

# View help
easycopy --help
```

### Examples

```bash
# Analyze a small project
easycopy https://github.com/karpathy/nanoGPT

# Save to specific location without opening
easycopy https://github.com/rust-lang/rust -o rust-src.html --no-open

# Increase max file size for larger files
easycopy https://github.com/torvalds/linux --max-bytes 200000
```

## Platform-Specific Notes

### Windows

- The compiled binary is fully standalone
- Git must be available in PATH (or use embedded git2 library)
- Opens in default browser automatically

### Linux

- Works on all major distributions
- Requires libssl-dev and pkg-config for building:
  ```bash
  # Debian/Ubuntu
  sudo apt-get install libssl-dev pkg-config
  
  # Fedora/RHEL
  sudo dnf install openssl-devel
  
  # Arch
  sudo pacman -S openssl pkg-config
  ```

### Android (Termux)

Full support for running in Termux CLI environment:

```bash
# Install dependencies
pkg install rust git openssl

# Clone and build
git clone https://github.com/DsChauhan08/easycopy
cd easycopy
cargo build --release

# Run
./target/release/easycopy https://github.com/username/repository
```

**Note:** The `--no-open` flag is recommended in Termux since browser integration is limited:
```bash
easycopy https://github.com/username/repository --no-open
```

Then open the generated HTML file with:
```bash
termux-open output.html
```

## How It Works

1. **Clone**: Creates a shallow clone of the repository in a temporary directory
2. **Analyze**: Scans all files, detecting binary files, large files, and text files
3. **Process**: 
   - Applies syntax highlighting to code files
   - Renders markdown files to HTML
   - Generates directory tree structure
   - Creates CXML format for LLM consumption
4. **Generate**: Builds a single self-contained HTML file with:
   - Embedded CSS for styling
   - JavaScript for view toggling
   - All file contents inline
5. **Cleanup**: Removes temporary directory automatically

## Development

### Run tests

```bash
cargo test
```

### Run with debug output

```bash
cargo run -- https://github.com/username/repository
```

### Build optimized release

```bash
cargo build --release
```

## Contributing

Contributions are welcome! This is a Rust port of the original Python rendergit tool, focused on cross-platform compatibility.

## License

BSD-Zero-Clause - go nuts!

## Credits

Inspired by and based on [rendergit](https://github.com/karpathy/rendergit) by Andrej Karpathy.

## Differences from Original

- Written in Rust instead of Python for better performance and cross-platform support
- Uses syntect for syntax highlighting (vs Pygments)
- Uses pulldown-cmark for markdown (vs python-markdown)
- Uses git2-rs for git operations (vs subprocess calls)
- Native support for Windows and Android/Termux
- Self-contained binary with no runtime dependencies (except system libraries)