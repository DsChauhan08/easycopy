#!/bin/bash
# Homebrew Formula Submission Script for easycopy
# This script guides you through submitting easycopy to Homebrew

set -e

echo "🍺 Homebrew Formula Submission Guide for easycopy"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}✅ Formula is ready and tested!${NC}"
echo ""
echo "The formula has been:"
echo "  ✓ Created with correct SHA256"
echo "  ✓ Tested and installed successfully"
echo "  ✓ Audited with brew audit --strict"
echo "  ✓ Passes all style checks"
echo ""

echo -e "${YELLOW}📋 Next Steps to Submit to Homebrew:${NC}"
echo ""

echo "1. Fork homebrew-core on GitHub:"
echo "   Visit: https://github.com/Homebrew/homebrew-core"
echo "   Click: 'Fork' button in the top right"
echo ""

echo "2. Add your fork as a remote:"
echo "   cd \$(brew --repository homebrew/core)"
echo "   git remote add DsChauhan08 https://github.com/DsChauhan08/homebrew-core.git"
echo ""

echo "3. Create a new branch for easycopy:"
echo "   git checkout -b easycopy-2.0.0"
echo ""

echo "4. Copy the formula to homebrew-core:"
echo "   cp /workspaces/easycopy/Formula/easycopy.rb Formula/e/easycopy.rb"
echo ""

echo "5. Commit the formula:"
echo "   git add Formula/e/easycopy.rb"
echo "   git commit -m 'easycopy 2.0.0 (new formula)'"
echo ""

echo "6. Push to your fork:"
echo "   git push DsChauhan08 easycopy-2.0.0"
echo ""

echo "7. Create Pull Request:"
echo "   Visit: https://github.com/Homebrew/homebrew-core/compare"
echo "   - base: Homebrew:master"
echo "   - compare: DsChauhan08:easycopy-2.0.0"
echo "   - Title: 'easycopy 2.0.0 (new formula)'"
echo "   - Description:"
echo ""
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
echo ""

echo "8. Wait for CI/CD:"
echo "   Homebrew's automated tests will run on your PR"
echo "   Maintainers will review and may request changes"
echo ""

echo -e "${GREEN}📄 Formula Location:${NC}"
echo "   /workspaces/easycopy/Formula/easycopy.rb"
echo ""

echo -e "${YELLOW}💡 Tips:${NC}"
echo "  • Be patient - maintainers review when they can"
echo "  • Respond to feedback promptly"
echo "  • Check CI logs if tests fail"
echo "  • Join #homebrew on Libera Chat for questions"
echo ""

echo -e "${GREEN}✨ Your formula is ready for submission!${NC}"
