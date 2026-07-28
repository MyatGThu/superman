# Setup

Two steps: Python dependencies (required) and the external security toolchain (optional but recommended).

## Python dependencies

```bash
pip install -r requirements.txt
```

This installs `anthropic` (the agent loop) and `PyYAML` (scope parsing). For a
live run you also need an API key:

```bash
export ANTHROPIC_API_KEY=sk-...
```

## External security tools (optional)

The framework works **without** these — the pure-Python adapters (HTTP headers,
TLS, port scan, exposed paths, secret scanning) find real issues on their own.
Installing the scanners below unlocks the rest.

```bash
./setup/install.sh          # best-effort install via your package manager
./setup/install.sh --python # only the Python deps
```

Tools it tries to install: `nmap`, `nikto`, `sqlmap`, `gitleaks`, `trivy`,
`nuclei`, `semgrep`. Some ship as Go binaries or via `brew`/`pipx`; the script
prints manual instructions for anything it can't handle in your environment.

## Verify readiness

```bash
python setup/bootstrap.py                 # environment check
python red-team/run.py  doctor            # red-team tool availability
python blue-team/run.py doctor            # blue-team tool availability
```

`doctor` shows which tools are available and how to install the missing ones.

## Scaffold an engagement

```bash
python setup/bootstrap.py --new-engagement <name>
```

Copies the scope template to `engagements/<name>/scope.yaml` for you to fill in.
