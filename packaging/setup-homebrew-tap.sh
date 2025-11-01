#!/bin/bash
# Script to set up Homebrew tap for easycopy

set -e

REPO_OWNER="DsChauhan08"
PACKAGE_NAME="easycopy"
VERSION="2.0.0"
TAP_REPO="homebrew-${PACKAGE_NAME}"

echo "🍺 Setting up Homebrew tap for ${PACKAGE_NAME}"

# Step 1: Get SHA256 of the release tarball
echo "📦 Calculating SHA256 of release tarball..."
TARBALL_URL="https://github.com/${REPO_OWNER}/${PACKAGE_NAME}/archive/refs/tags/v${VERSION}.tar.gz"
SHA256=$(curl -sL "${TARBALL_URL}" | shasum -a 256 | cut -d' ' -f1)
echo "✓ SHA256: ${SHA256}"

# Step 2: Create the formula file
FORMULA_DIR="Formula"
FORMULA_FILE="${FORMULA_DIR}/${PACKAGE_NAME}.rb"

mkdir -p "${FORMULA_DIR}"

cat > "${FORMULA_FILE}" <<EOF
class Easycopy < Formula
  desc "Flatten a GitHub repo into a single static HTML page"
  homepage "https://github.com/${REPO_OWNER}/${PACKAGE_NAME}"
  url "${TARBALL_URL}"
  sha256 "${SHA256}"
  license "BSD-Zero-Clause"

  depends_on "rust" => :build
  depends_on "pkg-config" => :build
  depends_on "openssl@3"

  def install
    system "cargo", "install", *std_cargo_args
  end

  test do
    system "#{bin}/${PACKAGE_NAME}", "--version"
  end
end
EOF

echo "✓ Created formula at ${FORMULA_FILE}"

# Step 3: Instructions
cat <<EOF

📋 Next steps:

1. Create the tap repository on GitHub:
   gh repo create ${TAP_REPO} --public --description "Homebrew tap for ${PACKAGE_NAME}"

2. Clone and set up the tap:
   git clone https://github.com/${REPO_OWNER}/${TAP_REPO}
   cd ${TAP_REPO}
   cp ${FORMULA_FILE} Formula/

3. Commit and push:
   git add Formula/${PACKAGE_NAME}.rb
   git commit -m "Add ${PACKAGE_NAME} formula v${VERSION}"
   git push origin main

4. Users can install with:
   brew tap ${REPO_OWNER}/${PACKAGE_NAME}
   brew install ${PACKAGE_NAME}

5. Or test locally first:
   brew install --build-from-source ${FORMULA_FILE}

EOF

echo "✅ Homebrew formula ready!"
