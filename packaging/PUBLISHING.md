# Publishing easycopy to Package Managers

This directory contains packaging files and instructions for publishing easycopy to various package managers.

## 📦 Homebrew (macOS/Linux)

### Option 1: Create a Tap (Recommended for your own repo)

1. Create a new repository named `homebrew-easycopy`:
```bash
gh repo create homebrew-easycopy --public --description "Homebrew tap for easycopy"
```

2. Clone and set up the tap:
```bash
git clone https://github.com/DsChauhan08/homebrew-easycopy
cd homebrew-easycopy
mkdir Formula
```

3. Get the SHA256 of the release tarball:
```bash
curl -sL https://github.com/DsChauhan08/easycopy/archive/refs/tags/v2.0.0.tar.gz | shasum -a 256
```

4. Copy `packaging/homebrew-formula.rb` to `Formula/easycopy.rb` and update the SHA256

5. Commit and push:
```bash
git add Formula/easycopy.rb
git commit -m "Add easycopy formula"
git push origin main
```

6. Users can then install with:
```bash
brew tap DsChauhan08/easycopy
brew install easycopy
```

### Option 2: Submit to Homebrew Core

For wider distribution, submit a PR to [Homebrew/homebrew-core](https://github.com/Homebrew/homebrew-core):
```bash
brew create https://github.com/DsChauhan08/easycopy/archive/refs/tags/v2.0.0.tar.gz
# Follow the prompts and create a PR
```

## 🏛️ AUR (Arch User Repository)

### Publishing to AUR

1. **Create AUR account**: https://aur.archlinux.org/register

2. **Set up SSH keys** for AUR:
```bash
ssh-keygen -f ~/.ssh/aur
cat ~/.ssh/aur.pub  # Add this to your AUR account
```

3. **Clone the AUR repository**:
```bash
git clone ssh://aur@aur.archlinux.org/easycopy.git aur-easycopy
cd aur-easycopy
```

4. **Copy and update PKGBUILD**:
```bash
cp ../packaging/PKGBUILD .
# Update sha256sums if needed
updpkgsums
makepkg --printsrcinfo > .SRCINFO
```

5. **Test the build**:
```bash
makepkg -si
```

6. **Push to AUR**:
```bash
git add PKGBUILD .SRCINFO
git commit -m "Initial import: easycopy 2.0.0"
git push origin master
```

7. Users can install with:
```bash
yay -S easycopy
# or
paru -S easycopy
# or manually:
git clone https://aur.archlinux.org/easycopy.git
cd easycopy
makepkg -si
```

## 🔴 DNF/Fedora (COPR)

### Publishing to Fedora COPR

1. **Create COPR account**: https://copr.fedorainfracloud.org/

2. **Install copr-cli**:
```bash
sudo dnf install copr-cli
```

3. **Create a new COPR project**:
```bash
copr-cli create easycopy --chroot fedora-39-x86_64 --chroot fedora-40-x86_64 --description "Flatten GitHub repos to HTML"
```

4. **Build from GitHub**:
```bash
copr-cli buildscm easycopy --clone-url https://github.com/DsChauhan08/easycopy --spec packaging/easycopy.spec --type git --method make
```

5. Users can install with:
```bash
sudo dnf copr enable DsChauhan08/easycopy
sudo dnf install easycopy
```

### Alternative: Direct RPM hosting

Create a repository file:
```bash
cat > /etc/yum.repos.d/easycopy.repo <<EOF
[easycopy]
name=easycopy Repository
baseurl=https://github.com/DsChauhan08/easycopy/releases/download/v2.0.0/
enabled=1
gpgcheck=0
EOF
```

## 📘 APT/Debian (PPA/Repository)

### Option 1: Launchpad PPA (Ubuntu)

1. **Create Launchpad account**: https://launchpad.net/

2. **Create a PPA**:
   - Go to https://launchpad.net/~your-username
   - Click "Create a new PPA"
   - Name it "easycopy"

3. **Build and upload** (requires debian source package):
```bash
# Install tools
sudo apt install devscripts debhelper dh-make

# Create debian source package
cd easycopy
debuild -S -sa
dput ppa:your-launchpad-id/easycopy ../easycopy_2.0.0-1_source.changes
```

4. Users can install with:
```bash
sudo add-apt-repository ppa:DsChauhan08/easycopy
sudo apt update
sudo apt install easycopy
```

### Option 2: GitHub Releases as APT Repository

Create a simple APT repository using your GitHub releases:

1. **Set up repository metadata** (create in a separate `apt-repo` branch):
```bash
# This is complex - use a tool like aptly or reprepro
```

2. **Simpler: Direct .deb download**:

Create a install script:
```bash
#!/bin/bash
VERSION="2.0.0"
wget "https://github.com/DsChauhan08/easycopy/releases/download/v${VERSION}/easycopy_${VERSION}-1_amd64.deb"
sudo dpkg -i "easycopy_${VERSION}-1_amd64.deb"
```

## 🚀 Quick Start for Users

Once published, update your README with:

```markdown
### Installation

**Homebrew** (macOS/Linux):
```bash
brew tap DsChauhan08/easycopy
brew install easycopy
```

**AUR** (Arch Linux):
```bash
yay -S easycopy
```

**DNF** (Fedora/RHEL):
```bash
sudo dnf copr enable DsChauhan08/easycopy
sudo dnf install easycopy
```

**APT** (Ubuntu/Debian):
```bash
sudo add-apt-repository ppa:DsChauhan08/easycopy
sudo apt update
sudo apt install easycopy
```
```

## 📝 Notes

- **Homebrew**: Easiest to set up, great for macOS users
- **AUR**: Popular with Arch users, requires manual updates
- **COPR**: Good for Fedora users, automated builds
- **PPA**: Best for Ubuntu users, requires Launchpad account

For production, prioritize Homebrew and AUR as they're most commonly used by developers.
