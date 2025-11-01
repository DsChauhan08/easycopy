#!/bin/bash
# Quick Homebrew Submission - Run this on your LOCAL machine

set -e

echo "🍺 Homebrew Formula Submission"
echo "==============================="
echo ""

# Clone your fork
if [ ! -d "homebrew-core" ]; then
    echo "Cloning your fork..."
    git clone git@github.com:DsChauhan08/homebrew-core.git
fi

cd homebrew-core

# Add upstream
echo "Setting up remotes..."
git remote add upstream https://github.com/Homebrew/homebrew-core.git 2>/dev/null || true
git fetch upstream

# Create branch from latest master
echo "Creating branch..."
git checkout -B easycopy-2.0.0 upstream/master

# Create the formula
echo "Creating formula file..."
mkdir -p Formula/e

cat > Formula/e/easycopy.rb << 'EOF'
class Easycopy < Formula
  desc "Flatten a GitHub repo into a single static HTML page"
  homepage "https://github.com/DsChauhan08/easycopy"
  url "https://github.com/DsChauhan08/easycopy/archive/refs/tags/v2.0.0.tar.gz"
  sha256 "421505a02c350a994ee2f28c95aa8b3d27d99482bdb45c756d4e586cd0e894ab"
  license "0BSD"
  head "https://github.com/DsChauhan08/easycopy.git", branch: "main"

  depends_on "rust" => :build

  def install
    system "cargo", "install", *std_cargo_args
  end

  test do
    # Test version output
    assert_match "easycopy 2.0.0", shell_output("#{bin}/easycopy --version")

    # Test help output
    assert_match "Flatten a GitHub repo", shell_output("#{bin}/easycopy --help")

    # Test local directory analysis (create a simple test repo)
    (testpath/"test.txt").write "Hello, Homebrew!"
    system "git", "init"
    system "git", "config", "user.email", "test@example.com"
    system "git", "config", "user.name", "Test User"
    system "git", "add", "."
    system "git", "commit", "-m", "Initial commit"

    # Run easycopy on the test directory
    system bin/"easycopy", testpath.to_s, "-o", testpath/"output.html", "--no-open"
    assert_path_exists testpath/"output.html"

    # Verify HTML output contains expected content
    assert_match "test.txt", (testpath/"output.html").read
  end
end
EOF

# Commit
echo "Committing..."
git add Formula/e/easycopy.rb
git commit -m "easycopy 2.0.0 (new formula)

easycopy is a Rust implementation of rendergit that works cross-platform.
It flattens any GitHub repository into a single, static HTML page."

# Push
echo "Pushing to your fork..."
git push -u origin easycopy-2.0.0

echo ""
echo "✅ Success! Now create the PR:"
echo "https://github.com/Homebrew/homebrew-core/compare/master...DsChauhan08:homebrew-core:easycopy-2.0.0"
echo ""
echo "Use this PR description:"
echo "---"
cat << 'PRDESC'
## easycopy 2.0.0 (new formula)

easycopy is a Rust implementation of rendergit that works cross-platform.
It flattens any GitHub repository into a single, static HTML page with 
syntax highlighting, markdown rendering, and navigation.

### Features:
- Local directory support (analyze without cloning)
- Branch/tag/commit selection
- Progress bars for large repositories
- Dual view modes (Human/LLM)
- Cross-platform (Windows, Linux, macOS, Android)

### Testing:
- [x] `brew install --build-from-source easycopy` (passed)
- [x] `brew test easycopy` (passed)
- [x] `brew audit --strict --online easycopy` (passed)

### Related:
- Homepage: https://github.com/DsChauhan08/easycopy
- License: 0BSD (BSD Zero Clause)
PRDESC
