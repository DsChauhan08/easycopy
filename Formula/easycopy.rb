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
