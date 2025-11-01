# Package Manager Publishing Guide

This guide provides step-by-step instructions for publishing easycopy to various package managers.

## 🎯 Quick Reference

| Package Manager | Platform | Difficulty | User Reach |
|----------------|----------|------------|------------|
| Homebrew | macOS/Linux | ⭐ Easy | ⭐⭐⭐⭐⭐ High |
| AUR | Arch Linux | ⭐⭐ Medium | ⭐⭐⭐⭐ Good |
| COPR | Fedora/RHEL | ⭐⭐ Medium | ⭐⭐⭐ Medium |
| PPA | Ubuntu/Debian | ⭐⭐⭐ Hard | ⭐⭐⭐⭐ Good |

## 🍺 Homebrew (Recommended First)

### Why Start Here?
- Easiest to set up
- Works on macOS AND Linux
- Large developer user base
- Automatic updates

### Setup Instructions

1. **Run the setup script** (already done):
```bash
./packaging/setup-homebrew-tap.sh
```

2. **Create the tap repository**:
```bash
gh repo create homebrew-easycopy --public --description "Homebrew tap for easycopy"
```

3. **Clone and populate**:
```bash
git clone https://github.com/DsChauhan08/homebrew-easycopy
cd homebrew-easycopy
mkdir -p Formula
cp ../easycopy/Formula/easycopy.rb Formula/
git add Formula/easycopy.rb
git commit -m "Add easycopy formula v2.0.0"
git push origin main
```

4. **Test the installation**:
```bash
brew tap DsChauhan08/easycopy
brew install easycopy
easycopy --version
```

### Updating for New Releases

When you release a new version:
```bash
cd homebrew-easycopy
# Update Formula/easycopy.rb with new version and SHA256
./update-formula.sh 2.1.0  # Helper script you can create
git commit -am "Update easycopy to v2.1.0"
git push
```

## 🏛️ AUR (Arch User Repository)

### Prerequisites
- AUR account: https://aur.archlinux.org/register
- SSH key configured for AUR

### Setup Instructions

1. **Configure SSH for AUR**:
```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config <<EOF
Host aur.archlinux.org
  IdentityFile ~/.ssh/aur
  User aur
EOF
```

2. **Clone AUR package**:
```bash
git clone ssh://aur@aur.archlinux.org/easycopy.git
cd easycopy
```

3. **Copy and test PKGBUILD**:
```bash
cp ../packaging/PKGBUILD .
updpkgsums  # Update checksums
makepkg -si  # Test build
makepkg --printsrcinfo > .SRCINFO
```

4. **Publish**:
```bash
git add PKGBUILD .SRCINFO
git commit -m "easycopy 2.0.0: Initial release"
git push
```

5. **Users install with**:
```bash
yay -S easycopy
```

### Updating for New Releases
```bash
cd easycopy-aur
# Update pkgver in PKGBUILD
updpkgsums
makepkg --printsrcinfo > .SRCINFO
git commit -am "Update to 2.1.0"
git push
```

## 🔴 Fedora COPR

### Prerequisites
- COPR account: https://copr.fedorainfracloud.org/
- copr-cli installed

### Setup Instructions

1. **Install copr-cli**:
```bash
sudo dnf install copr-cli
copr-cli --help
```

2. **Create COPR project**:
```bash
copr-cli create easycopy \
  --chroot fedora-39-x86_64 \
  --chroot fedora-40-x86_64 \
  --chroot fedora-rawhide-x86_64 \
  --description "Flatten GitHub repos to HTML" \
  --instructions "https://github.com/DsChauhan08/easycopy"
```

3. **Build from spec file**:
```bash
copr-cli buildscm easycopy \
  --clone-url https://github.com/DsChauhan08/easycopy \
  --spec packaging/easycopy.spec \
  --type git \
  --method tito
```

4. **Users install with**:
```bash
sudo dnf copr enable DsChauhan08/easycopy
sudo dnf install easycopy
```

### Alternative: Manual RPM Upload
```bash
# Build RPM locally (from release workflow)
copr-cli build easycopy path/to/easycopy-2.0.0-1.x86_64.rpm
```

## 📘 Ubuntu PPA (Launchpad)

### Prerequisites
- Launchpad account: https://launchpad.net/
- GPG key configured

### Setup Instructions

1. **Create PPA on Launchpad**:
   - Visit https://launchpad.net/~your-username/+activate-ppa
   - Name: `easycopy`
   - Description: "Flatten GitHub repos to HTML"

2. **Prepare source package**:
```bash
sudo apt install devscripts debhelper dh-cargo
cd easycopy
# Create debian/ directory if not exists
debuild -S -sa -k<YOUR_GPG_KEY>
```

3. **Upload to PPA**:
```bash
dput ppa:DsChauhan08/easycopy ../easycopy_2.0.0-1_source.changes
```

4. **Users install with**:
```bash
sudo add-apt-repository ppa:DsChauhan08/easycopy
sudo apt update
sudo apt install easycopy
```

## 🚀 Automated Publishing

### GitHub Actions Workflow

Create `.github/workflows/publish-packages.yml`:
```yaml
name: Publish to Package Managers

on:
  release:
    types: [published]

jobs:
  update-homebrew:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update Homebrew formula
        run: |
          # Automatically update homebrew tap
          # Implementation details in workflow
```

## 📊 Maintenance Checklist

After each release:
- [ ] Update Homebrew formula with new version/SHA256
- [ ] Update AUR PKGBUILD with new version
- [ ] Trigger COPR rebuild
- [ ] Upload new source package to PPA
- [ ] Test installation from each package manager
- [ ] Update README installation instructions

## 🔍 Verification Commands

Test installations:
```bash
# Homebrew
brew install DsChauhan08/easycopy/easycopy && easycopy --version

# AUR
yay -S easycopy && easycopy --version

# COPR
sudo dnf copr enable DsChauhan08/easycopy && sudo dnf install easycopy && easycopy --version

# PPA
sudo add-apt-repository ppa:DsChauhan08/easycopy && sudo apt install easycopy && easycopy --version
```

## 📞 Support

- Homebrew issues: Create issue in homebrew-easycopy repo
- AUR issues: Comment on AUR package page
- COPR issues: COPR project page
- PPA issues: Launchpad bug tracker
