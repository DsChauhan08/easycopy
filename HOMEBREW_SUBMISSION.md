# Submitting easycopy to Homebrew

This guide walks through submitting easycopy to the official Homebrew repository.

## ✅ Pre-submission Checklist

- [x] Formula created and tested locally
- [x] SHA256 verified for v2.0.0 release
- [x] Comprehensive test suite added
- [x] License is BSD-Zero-Clause (acceptable for Homebrew)
- [x] Software is open source and maintained
- [x] Version 2.0.0 is stable and released

## 📋 Steps to Submit

### 1. Set Up Environment

```bash
# Set required environment variables
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_FROM_API=1

# Tap homebrew-core (this clones the repository)
brew tap --force homebrew/core
```

### 2. Create the Formula

The formula is already created at `Formula/easycopy.rb`. To add it to homebrew-core:

```bash
# Navigate to homebrew-core
cd "$(brew --repository homebrew/core)"

# Create a new branch
git checkout -b easycopy

# Copy the formula to the proper location
# Homebrew uses alphabetical organization in subdirectories
cp /workspaces/easycopy/Formula/easycopy.rb Formula/e/easycopy.rb

# Add the formula
git add Formula/e/easycopy.rb
```

### 3. Test the Formula Locally

```bash
# Install from source to test
brew install --build-from-source easycopy

# Test that it works
easycopy --version
easycopy --help

# Test on a real repository
easycopy https://github.com/DsChauhan08/easycopy --branch main -o test.html --no-open

# Uninstall to test that
brew uninstall easycopy
```

### 4. Run Audits and Style Checks

```bash
# Run strict audit
brew audit --strict --new --online easycopy

# Run style check and auto-fix issues
brew style --fix easycopy

# Run the formula's test
brew test easycopy
```

All checks should pass without errors before proceeding.

### 5. Commit the Formula

```bash
# Commit with proper message format
git commit -v

# Use this commit message:
# easycopy 2.0.0 (new formula)
# 
# Flatten a GitHub repo into a single static HTML page.
# 
# Cross-platform tool written in Rust that analyzes local directories
# or clones remote repositories, then renders source code into a single
# self-contained HTML file with syntax highlighting, markdown rendering,
# and dual view modes (Human/LLM).
```

### 6. Push and Create Pull Request

```bash
# Fork homebrew-core on GitHub first (if not already done)
# Then add your fork as a remote
git remote add your-fork https://github.com/YOUR_USERNAME/homebrew-core.git

# Push to your fork
git push your-fork easycopy

# Go to GitHub and create a pull request
# From: your-fork/easycopy
# To: Homebrew/homebrew-core/master
```

### 7. Pull Request Description

Use this template for your PR description:

```markdown
## easycopy 2.0.0 (new formula)

Flatten a GitHub repo into a single static HTML page for fast skimming and search.

### Features
- Cross-platform (macOS, Linux, Windows, Android/Termux)
- Local directory and remote repository support
- Branch/tag/commit selection
- Syntax highlighting via syntect
- Markdown rendering
- Progress indicators
- Dual view modes (Human-readable + LLM-optimized CXML)

### Testing
- [x] `brew install --build-from-source easycopy` succeeds
- [x] `brew test easycopy` passes
- [x] `brew audit --strict --new --online easycopy` passes
- [x] Works on macOS (tested on [YOUR_MACOS_VERSION])

### Links
- Homepage: https://github.com/DsChauhan08/easycopy
- Release: https://github.com/DsChauhan08/easycopy/releases/tag/v2.0.0
- License: BSD-Zero-Clause
```

### 8. Respond to Feedback

Homebrew maintainers will review your PR and may request changes:
- Be responsive to feedback
- Make requested changes on the same branch
- Push updates to your fork
- The PR will update automatically

### 9. Clean Up After Merge

Once your PR is merged:

```bash
# Return to master
cd "$(brew --repository homebrew/core)"
git checkout master

# Clean up environment variables
unset HOMEBREW_NO_AUTO_UPDATE
unset HOMEBREW_NO_INSTALL_FROM_API

# Update Homebrew
brew update

# Test the official formula
brew install easycopy
```

## 📝 Important Notes

### Formula Requirements Met

✅ **Stable version**: v2.0.0 is released and tagged  
✅ **Open source**: BSD-Zero-Clause license  
✅ **Actively maintained**: Recent commits and releases  
✅ **Build from source**: Rust project with Cargo  
✅ **Tests included**: Comprehensive test suite in formula  
✅ **Dependencies declared**: OpenSSL, pkg-config, Rust  

### Common Rejection Reasons to Avoid

- ❌ Pre-release or beta versions → We're using stable 2.0.0 ✅
- ❌ Duplicate of existing formula → Unique tool, checked ✅
- ❌ Closed source → Open source BSD-0 ✅
- ❌ Not notable enough → Useful developer tool ✅
- ❌ Poor test coverage → Comprehensive tests added ✅

### Expected Timeline

- **PR submission**: Immediate
- **Initial review**: 1-7 days
- **Revision cycles**: Variable (hours to days)
- **Merge**: After approval from maintainers
- **Available via brew**: Immediate after merge

## 🔍 Troubleshooting

### If `brew audit` fails:

```bash
# Check what's wrong
brew audit --new --online easycopy

# Common fixes:
# - Update SHA256 if tarball changed
# - Fix license format
# - Update dependency versions
# - Improve test coverage
```

### If `brew test` fails:

```bash
# Run test with verbose output
brew test --verbose easycopy

# Debug the test
brew install --build-from-source --verbose easycopy
```

### If build fails:

```bash
# Check build logs
brew install --build-from-source --verbose easycopy 2>&1 | tee build.log

# Common issues:
# - Missing dependencies (add to formula)
# - Rust version too old (specify minimum)
# - OpenSSL linking issues (check vendored-openssl feature)
```

## 🎯 Alternative: Personal Tap

If you want immediate availability while waiting for homebrew-core approval:

```bash
# Users can install from your tap immediately
brew tap DsChauhan08/easycopy
brew install easycopy

# Then later migrate to official when merged
brew untap DsChauhan08/easycopy
brew install easycopy  # Now from homebrew-core
```

## 📞 Getting Help

- **Homebrew Discussions**: https://github.com/orgs/Homebrew/discussions
- **Formula Cookbook**: https://docs.brew.sh/Formula-Cookbook
- **Acceptable Formulae**: https://docs.brew.sh/Acceptable-Formulae

---

**Ready to submit!** The formula is tested and meets all Homebrew requirements. Good luck! 🍺
