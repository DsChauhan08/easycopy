# Release Instructions

## How to Create a Release

The GitHub Actions workflow will automatically build and publish releases when you push a version tag.

### Quick Release

```bash
# Tag the current commit with a version
git tag v1.0.0

# Push the tag to trigger the release workflow
git push origin v1.0.0
```

### Release Artifacts

When you push a tag like `v1.0.0`, the workflow will automatically create:

#### 1. **Linux Binaries (tar.xz)**
- `easycopy-x86_64-unknown-linux-gnu-v1.0.0.tar.xz` - 64-bit Intel/AMD Linux
- `easycopy-aarch64-unknown-linux-gnu-v1.0.0.tar.xz` - 64-bit ARM Linux (Raspberry Pi, Android, etc.)

#### 2. **Windows Binary (zip)**
- `easycopy-x86_64-pc-windows-msvc-v1.0.0.zip` - Windows 64-bit with .exe

#### 3. **macOS Binary (tar.xz)**
- `easycopy-x86_64-apple-darwin-v1.0.0.tar.xz` - macOS Intel 64-bit

#### 4. **Debian Package (.deb)**
- `easycopy_1.0.0_amd64.deb` - For Debian, Ubuntu, Linux Mint, Pop!_OS, etc.
- Install with: `sudo dpkg -i easycopy_1.0.0_amd64.deb`

#### 5. **RPM Package (.rpm)**
- `easycopy-1.0.0-1.x86_64.rpm` - For Fedora, RHEL, CentOS, openSUSE, etc.
- Install with: `sudo rpm -i easycopy-1.0.0-1.x86_64.rpm` or `sudo dnf install easycopy-1.0.0-1.x86_64.rpm`

#### 6. **Source Code (tar.xz)**
- `easycopy-v1.0.0-source.tar.xz` - Complete source code for manual compilation

## Version Numbering

Use [Semantic Versioning](https://semver.org/):
- `v1.0.0` - Stable release
- `v1.0.1` - Patch release (bug fixes)
- `v1.1.0` - Minor release (new features, backwards compatible)
- `v2.0.0` - Major release (breaking changes)
- `v1.0.0-alpha` - Pre-release (alpha)
- `v1.0.0-beta.1` - Pre-release (beta)
- `v1.0.0-rc.1` - Release candidate

## Step-by-Step Release Process

### 1. Update Version in Cargo.toml

```bash
# Edit Cargo.toml and update version
nano Cargo.toml  # Change version = "0.1.0" to "1.0.0"
```

### 2. Update CHANGELOG (Optional but Recommended)

```bash
# Document what changed
nano CHANGELOG.md
```

### 3. Commit Changes

```bash
git add Cargo.toml CHANGELOG.md
git commit -m "Bump version to 1.0.0"
git push
```

### 4. Create and Push Tag

```bash
# Create annotated tag with message
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag to GitHub (this triggers the workflow)
git push origin v1.0.0
```

### 5. Monitor the Build

1. Go to: https://github.com/DsChauhan08/easycopy/actions
2. Watch the "Build & Release" workflow
3. It takes ~10-15 minutes to complete all builds

### 6. Release is Published!

Once complete, your release will be available at:
https://github.com/DsChauhan08/easycopy/releases

## Installing the Packages

### Debian/Ubuntu (.deb)
```bash
# Download and install
wget https://github.com/DsChauhan08/easycopy/releases/download/v1.0.0/easycopy_1.0.0_amd64.deb
sudo dpkg -i easycopy_1.0.0_amd64.deb

# Or use apt
sudo apt install ./easycopy_1.0.0_amd64.deb
```

### Fedora/RHEL (.rpm)
```bash
# Download and install
wget https://github.com/DsChauhan08/easycopy/releases/download/v1.0.0/easycopy-1.0.0-1.x86_64.rpm
sudo dnf install easycopy-1.0.0-1.x86_64.rpm

# Or with rpm
sudo rpm -i easycopy-1.0.0-1.x86_64.rpm
```

### Windows (.zip)
```powershell
# Download from releases page, extract, and run
# Or add to PATH for system-wide access
```

### Linux/macOS (tar.xz)
```bash
# Download and extract
wget https://github.com/DsChauhan08/easycopy/releases/download/v1.0.0/easycopy-x86_64-unknown-linux-gnu-v1.0.0.tar.xz
tar -xf easycopy-x86_64-unknown-linux-gnu-v1.0.0.tar.xz

# Move to system path
sudo mv easycopy /usr/local/bin/
sudo chmod +x /usr/local/bin/easycopy
```

### Manual Compilation from Source
```bash
# Download source
wget https://github.com/DsChauhan08/easycopy/releases/download/v1.0.0/easycopy-v1.0.0-source.tar.xz
tar -xf easycopy-v1.0.0-source.tar.xz
cd easycopy-v1.0.0/

# Build
cargo build --release

# Install
sudo cp target/release/easycopy /usr/local/bin/
```

## Troubleshooting

### Build Failed?
- Check the Actions tab for error logs
- Common issues:
  - Syntax errors in Cargo.toml
  - Missing dependencies in CI
  - Version number mismatch

### Delete a Release
```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Then delete the release from GitHub UI
```

### Update a Release
You cannot update a release with the same tag. You need to:
1. Delete the tag and release
2. Make your fixes
3. Create a new tag (e.g., v1.0.1)

## CI/CD Workflow Details

The workflow runs on:
- Linux (Ubuntu) - Builds x86_64 and aarch64 binaries, .deb, .rpm
- Windows - Builds .exe
- macOS - Builds Intel binary

All artifacts are:
- Compressed with tar.xz (better compression than .gz)
- Automatically uploaded to GitHub Releases
- Available immediately after workflow completes

## Quick Commands Reference

```bash
# Create release
git tag -a v1.0.0 -m "Release 1.0.0" && git push origin v1.0.0

# List tags
git tag -l

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# View latest tag
git describe --tags --abbrev=0
```
