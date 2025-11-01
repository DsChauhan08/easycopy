class Easycopy < Formula
  desc "Flatten a GitHub repo into a single static HTML page"
  homepage "https://github.com/DsChauhan08/easycopy"
  url "https://github.com/DsChauhan08/easycopy/archive/refs/tags/v2.0.0.tar.gz"
  sha256 "421505a02c350a994ee2f28c95aa8b3d27d99482bdb45c756d4e586cd0e894ab"
  license "BSD-Zero-Clause"

  depends_on "rust" => :build
  depends_on "pkg-config" => :build
  depends_on "openssl@3"

  def install
    system "cargo", "install", *std_cargo_args
  end

  test do
    system "#{bin}/easycopy", "--version"
  end
end
