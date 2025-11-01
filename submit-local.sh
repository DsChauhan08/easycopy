#!/bin/bash
# Run this on your local machine (not in the codespace)

set -e

echo "📦 Homebrew Formula Submission - Local Steps"
echo "=============================================="
echo ""

# Clone your fork
echo "1. Clone your homebrew-core fork:"
echo "   git clone git@github.com:DsChauhan08/homebrew-core.git"
echo "   cd homebrew-core"
echo ""

# Apply the patch
echo "2. Apply the formula patch:"
echo "   curl -O https://raw.githubusercontent.com/DsChauhan08/easycopy/main/easycopy-formula.patch"
echo "   git am easycopy-formula.patch"
echo ""

# Push
echo "3. Push to your fork:"
echo "   git push origin easycopy-2.0.0"
echo ""

# Create PR
echo "4. Create PR:"
echo "   Visit: https://github.com/Homebrew/homebrew-core/compare/master...DsChauhan08:easycopy-2.0.0"
echo ""

echo "Or run these commands:"
cat << 'COMMANDS'

git clone git@github.com:DsChauhan08/homebrew-core.git
cd homebrew-core
curl -O https://raw.githubusercontent.com/DsChauhan08/easycopy/main/easycopy-formula.patch
git am easycopy-formula.patch
git push origin easycopy-2.0.0

COMMANDS

echo ""
echo "Then create PR at:"
echo "https://github.com/Homebrew/homebrew-core/compare/master...DsChauhan08:easycopy-2.0.0"
