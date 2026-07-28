#!/usr/bin/env bash
# =============================================================================
# Superman toolchain installer (best-effort, idempotent).
#
# Installs the external security tools the red/blue agents can drive. The
# framework works WITHOUT these (pure-Python tools cover recon, headers, TLS,
# ports, secret scanning) — this just unlocks the heavier scanners.
#
# Usage:  ./setup/install.sh            # install Python deps + as many tools as it can
#         ./setup/install.sh --python   # only the Python dependencies
# =============================================================================
set -uo pipefail

say() { printf "\033[1;34m[setup]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

install_python() {
  say "Installing Python dependencies from requirements.txt"
  if have pip3; then pip3 install -r "$ROOT/requirements.txt" || warn "pip install failed"
  elif have pip; then pip install -r "$ROOT/requirements.txt" || warn "pip install failed"
  else warn "pip not found; install Python 3.10+ and pip first"; fi
}

pkg_install() {
  # Try the platform package manager for a list of packages.
  local pkgs=("$@")
  if have apt-get; then sudo apt-get update -y >/dev/null 2>&1; sudo apt-get install -y "${pkgs[@]}" ;
  elif have dnf; then sudo dnf install -y "${pkgs[@]}" ;
  elif have pacman; then sudo pacman -Sy --noconfirm "${pkgs[@]}" ;
  elif have brew; then brew install "${pkgs[@]}" ;
  else warn "no supported package manager found for: ${pkgs[*]}"; return 1; fi
}

install_python
[ "${1:-}" = "--python" ] && { say "Python-only install complete."; exit 0; }

say "Installing security tools (best effort — skips what it can't install)"

# From distro/brew packages
for t in nmap nikto sqlmap; do
  have "$t" && { say "$t already present"; continue; }
  pkg_install "$t" && say "installed $t" || warn "could not install $t via package manager"
done

# gitleaks / trivy / nuclei often ship as Go binaries or via brew.
if ! have gitleaks; then
  if have brew; then brew install gitleaks; elif have go; then go install github.com/gitleaks/gitleaks/v8@latest; else
    warn "install gitleaks manually: https://github.com/gitleaks/gitleaks/releases"; fi
fi
if ! have trivy; then
  if have brew; then brew install trivy; else
    warn "install trivy manually: https://aquasecurity.github.io/trivy/latest/getting-started/installation/"; fi
fi
if ! have nuclei; then
  if have go; then go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && nuclei -update-templates || true
  elif have brew; then brew install nuclei; else
    warn "install nuclei manually: https://github.com/projectdiscovery/nuclei/releases"; fi
fi
if ! have semgrep; then
  if have pipx; then pipx install semgrep; elif have pip3; then pip3 install semgrep; else
    warn "install semgrep manually: pip install semgrep"; fi
fi

say "Done. Verify with:  python red-team/run.py doctor  &&  python blue-team/run.py doctor"
