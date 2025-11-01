#!/bin/bash
set -e

echo "🍺 Quick Homebrew Submission"
echo "=============================="
echo ""

# Check if fork exists
echo "Checking if you have a homebrew-core fork..."
if curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/repos/DsChauhan08/homebrew-core | grep -q '"fork": true'; then
    echo "✅ Fork exists!"
else
    echo "❌ Fork not found."
    echo ""
    echo "Please fork manually:"
    echo "1. Visit: https://github.com/Homebrew/homebrew-core"
    echo "2. Click 'Fork' button"
    echo "3. Wait for fork to complete"
    echo "4. Run this script again"
    echo ""
    
    # Open browser to make it easier
    if command -v xdg-open &> /dev/null; then
        echo "Opening browser..."
        xdg-open "https://github.com/Homebrew/homebrew-core/fork" 2>/dev/null || true
    fi
    
    exit 1
fi

# Continue with submission
cd $(brew --repository homebrew/core)

# Add fork as remote
echo "Adding your fork as remote..."
git remote remove DsChauhan08 2>/dev/null || true
git remote add DsChauhan08 https://github.com/DsChauhan08/homebrew-core.git

# Update main branch
echo "Updating main branch..."
git fetch origin
git checkout master
git reset --hard origin/master

# Create branch
echo "Creating branch..."
git checkout -b easycopy-2.0.0

# Copy formula
echo "Copying formula..."
mkdir -p Formula/e
cp /workspaces/easycopy/Formula/easycopy.rb Formula/e/easycopy.rb

# Commit
echo "Committing..."
git add Formula/e/easycopy.rb
git commit -m "easycopy 2.0.0 (new formula)

easycopy is a Rust implementation of rendergit that works cross-platform.
It flattens any GitHub repository into a single, static HTML page."

# Push
echo "Pushing to your fork..."
git push -u DsChauhan08 easycopy-2.0.0

echo ""
echo "✅ Branch pushed!"
echo ""
echo "Now create the PR:"
echo "https://github.com/Homebrew/homebrew-core/compare/master...DsChauhan08:easycopy-2.0.0"
echo ""

# Try to create PR with gh
if command -v gh &> /dev/null; then
    echo "Attempting to create PR with gh..."
    gh pr create \
        --repo Homebrew/homebrew-core \
        --base master \
        --head DsChauhan08:easycopy-2.0.0 \
        --title "easycopy 2.0.0 (new formula)" \
        --body "## easycopy 2.0.0 (new formula)

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
- [x] \`brew install --build-from-source easycopy\` (passed)
- [x] \`brew test easycopy\` (passed)
- [x] \`brew audit --strict --online easycopy\` (passed)

### Related:
- Homepage: https://github.com/DsChauhan08/easycopy
- License: 0BSD (BSD Zero Clause)" 2>&1 || echo "Could not create PR automatically. Please create it manually using the link above."
fi
