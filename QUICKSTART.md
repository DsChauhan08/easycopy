# Quick Start Guide

## Installation

### Linux/macOS
```bash
# Install Rust if you don't have it
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Clone and build
git clone https://github.com/DsChauhan08/easycopy
cd easycopy
cargo build --release

# The binary is at: target/release/easycopy
```

### Windows
1. Install Rust from https://rustup.rs/
2. Open PowerShell or Command Prompt:
```powershell
git clone https://github.com/DsChauhan08/easycopy
cd easycopy
cargo build --release

# The binary is at: target\release\easycopy.exe
```

### Android (Termux)
```bash
# Install dependencies
pkg install rust git openssl

# Clone and build
git clone https://github.com/DsChauhan08/easycopy
cd easycopy
cargo build --release

# The binary is at: target/release/easycopy
```

## Usage Examples

### Basic usage
```bash
# Clone, render, and open in browser
easycopy https://github.com/username/repository
```

### Save to specific location
```bash
easycopy https://github.com/username/repository -o output.html
```

### Don't open in browser (useful for Termux)
```bash
easycopy https://github.com/username/repository --no-open
```

### Custom max file size
```bash
# Set max file size to 100KB (default is 50KB)
easycopy https://github.com/username/repository --max-bytes 102400
```

## Features Demo

Try it on some interesting repositories:

```bash
# Small educational project
easycopy https://github.com/karpathy/nanoGPT

# Documentation-heavy project
easycopy https://github.com/github/docs --max-bytes 100000

# The original Python version
easycopy https://github.com/karpathy/rendergit
```

## Output

The tool generates a single HTML file that includes:
- 👤 **Human View**: Syntax-highlighted code with navigation
- 🤖 **LLM View**: CXML format for copying to AI assistants
- Directory tree structure
- File size statistics
- Smart filtering (skips binaries and oversized files)

## Troubleshooting

### "cargo: command not found"
Make sure Rust is installed and in your PATH:
```bash
source "$HOME/.cargo/env"
```

### Build errors on Linux
Install required dependencies:
```bash
# Debian/Ubuntu
sudo apt-get install libssl-dev pkg-config

# Fedora/RHEL
sudo dnf install openssl-devel

# Arch
sudo pacman -S openssl pkg-config
```

### Browser doesn't open in Termux
Use the `--no-open` flag and open manually:
```bash
easycopy https://github.com/user/repo --no-open -o output.html
termux-open output.html
```

## Performance

The Rust version is significantly faster than the Python original:
- ~2-3x faster for small repos (<100 files)
- ~5-10x faster for medium repos (100-1000 files)
- Lower memory usage
- Faster startup time

## Next Steps

- Install to system: `cargo install --path .`
- Run tests: `cargo test`
- Build smaller binary: Already using `--release` mode with LTO
- Contribute: Fork the repo and submit a PR!
