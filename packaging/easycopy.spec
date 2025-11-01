Name:           easycopy
Version:        2.0.0
Release:        1%{?dist}
Summary:        Flatten a GitHub repo into a single static HTML page

License:        BSD-Zero-Clause
URL:            https://github.com/DsChauhan08/easycopy
Source0:        https://github.com/DsChauhan08/easycopy/archive/refs/tags/v%{version}.tar.gz

BuildRequires:  rust >= 1.70
BuildRequires:  cargo
BuildRequires:  pkgconfig(openssl)
Requires:       openssl-libs

%description
easycopy is a Rust implementation of rendergit that works on Windows, Linux, 
and Android (Termux). Flatten any GitHub repository into a single, static HTML 
page with syntax highlighting, markdown rendering, and a clean sidebar navigation.

%prep
%autosetup

%build
cargo build --release

%install
install -D -m 755 target/release/%{name} %{buildroot}%{_bindir}/%{name}
install -D -m 644 README.md %{buildroot}%{_docdir}/%{name}/README.md
install -D -m 644 LICENSE %{buildroot}%{_docdir}/%{name}/LICENSE

%files
%{_bindir}/%{name}
%doc %{_docdir}/%{name}/README.md
%license %{_docdir}/%{name}/LICENSE

%changelog
* Fri Nov 01 2025 Dhananjay Singh <dhananjay@example.com> - 2.0.0-1
- Initial release
- Add local directory support
- Add branch/tag/commit selection
- Add progress bars
