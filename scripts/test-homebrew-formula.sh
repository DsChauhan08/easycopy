#!/bin/bash
# Test and submit easycopy formula to Homebrew
# Run this script on macOS or Linux with Homebrew installed

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍺 Homebrew Formula Submission Script${NC}"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew is not installed${NC}"
    echo "Install from: https://brew.sh"
    exit 1
fi

echo -e "${GREEN}✓ Homebrew found${NC}"

# Step 1: Set environment variables
echo ""
echo -e "${BLUE}Step 1: Setting environment variables${NC}"
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_FROM_API=1
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 2: Tap homebrew-core
echo ""
echo -e "${BLUE}Step 2: Tapping homebrew/core${NC}"
brew tap --force homebrew/core
echo -e "${GREEN}✓ Tapped homebrew/core${NC}"

# Step 3: Test formula locally
echo ""
echo -e "${BLUE}Step 3: Testing formula from source${NC}"
FORMULA_PATH="$(pwd)/Formula/easycopy.rb"

if [ ! -f "$FORMULA_PATH" ]; then
    echo -e "${RED}❌ Formula not found at $FORMULA_PATH${NC}"
    exit 1
fi

echo "Installing from: $FORMULA_PATH"
brew install --build-from-source "$FORMULA_PATH"
echo -e "${GREEN}✓ Formula installed successfully${NC}"

# Step 4: Run basic tests
echo ""
echo -e "${BLUE}Step 4: Running basic tests${NC}"
easycopy --version
easycopy --help
echo -e "${GREEN}✓ Basic commands work${NC}"

# Step 5: Run Homebrew audit
echo ""
echo -e "${BLUE}Step 5: Running brew audit${NC}"
brew audit --strict --new --online easycopy
echo -e "${GREEN}✓ Audit passed${NC}"

# Step 6: Run style check
echo ""
echo -e "${BLUE}Step 6: Running brew style${NC}"
brew style --fix easycopy || true
echo -e "${GREEN}✓ Style check complete${NC}"

# Step 7: Run formula test
echo ""
echo -e "${BLUE}Step 7: Running brew test${NC}"
brew test easycopy
echo -e "${GREEN}✓ Tests passed${NC}"

# Step 8: Uninstall to clean up
echo ""
echo -e "${BLUE}Step 8: Cleaning up${NC}"
brew uninstall easycopy
echo -e "${GREEN}✓ Uninstalled${NC}"

# Instructions for submission
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All tests passed! Ready to submit to Homebrew${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo "1. Navigate to homebrew-core:"
echo "   cd \$(brew --repository homebrew/core)"
echo ""
echo "2. Create a branch:"
echo "   git checkout -b easycopy"
echo ""
echo "3. Copy the formula:"
echo "   cp $FORMULA_PATH Formula/e/easycopy.rb"
echo ""
echo "4. Add and commit:"
echo "   git add Formula/e/easycopy.rb"
echo '   git commit -m "easycopy 2.0.0 (new formula)"'
echo ""
echo "5. Fork homebrew/homebrew-core on GitHub, then:"
echo "   git remote add fork https://github.com/YOUR_USERNAME/homebrew-core.git"
echo "   git push fork easycopy"
echo ""
echo "6. Create PR at:"
echo "   https://github.com/Homebrew/homebrew-core/pulls"
echo ""
echo -e "${BLUE}See HOMEBREW_SUBMISSION.md for detailed instructions${NC}"
echo ""

# Clean up environment
unset HOMEBREW_NO_AUTO_UPDATE
unset HOMEBREW_NO_INSTALL_FROM_API
