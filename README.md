# Superman — Adaptive Red Team / Blue Team Security Agents

Two AI-driven security agents that stress-test an environment and then harden it:

- **Red Team** (`red-team/`) — an adaptive offensive agent. It recons the target, enumerates exposure, identifies vulnerabilities and misconfigurations, and — when the engagement authorizes it — verifies exploitable ones by driving standard tools. Output: evidence-backed findings.
- **Blue Team** (`blue-team/`) — an adaptive defensive agent. It triages those findings, produces concrete remediations, generates ready-to-apply hardening, verifies the fixes actually close the issue, and upgrades the operator's standing security protocols.

Both are built on a shared engine (`core/`) that makes them **adaptive** (a Claude-driven loop chooses the next action from what it observes, rather than following a fixed script) and **safe** (every single action is authorized against an explicit engagement scope before it runs).

They work against homelabs, business infrastructure, personal sites/portfolios, and source repositories.

> ⚠️ **Authorized testing only.** These agents perform real security testing, including — when enabled — active exploitation. Only ever run them against systems you own or have **explicit written permission** to test. See [RULES_OF_ENGAGEMENT.md](RULES_OF_ENGAGEMENT.md).

---

## How it works

```
                 engagements/<name>/scope.yaml   ← what's authorized (targets + rules)
                            │
                 ┌──────────▼───────────┐
                 │   core/authorization  │  every action passes through the Guard:
                 │        (Guard)        │  in-scope? not prohibited? active allowed?
                 └──────────┬───────────┘
        ┌───────────────────┼───────────────────┐
        │                   │                    │
 ┌──────▼──────┐    ┌───────▼────────┐    ┌──────▼───────┐
 │  red-team   │    │   core/engine   │    │  blue-team   │
 │  run.py     │──▶ │  adaptive loop  │ ◀──│  run.py      │
 │ (offensive) │    │  (Claude + tools)│    │ (defensive)  │
 └─────────────┘    └───────┬─────────┘    └──────────────┘
                            │
                    core/tools/*  (recon · web · exploit · repo · remediation)
                            │
                 engagements/<name>/  findings.json · audit.jsonl · report.md
```

The **red team hands findings to the blue team** through a shared `findings.json`: red discovers, blue remediates and verifies. The whole engagement — every authorization decision and tool run — is recorded in an append-only `audit.jsonl`.

## Quick start

```bash
# 1. Install (Python deps always; external scanners best-effort)
pip install -r requirements.txt
./setup/install.sh                 # optional: nmap, nuclei, sqlmap, gitleaks, trivy, semgrep
python setup/bootstrap.py          # check readiness

# 2. Define an authorized engagement
python setup/bootstrap.py --new-engagement myhomelab
$EDITOR engagements/myhomelab/scope.yaml     # set targets + authorization: true + attestation

# 3. Validate scope (no network, no API needed)
python red-team/run.py check-scope --scope engagements/myhomelab/scope.yaml --target app.example.com

# 4. Dry run (plans, never touches targets or the API)
python red-team/run.py run --scope engagements/myhomelab/scope.yaml --dry-run

# 5. Live run (needs ANTHROPIC_API_KEY)
export ANTHROPIC_API_KEY=sk-...
python red-team/run.py  run --scope engagements/myhomelab/scope.yaml --verbose
python blue-team/run.py run --scope engagements/myhomelab/scope.yaml --verbose
python blue-team/run.py report --scope engagements/myhomelab/scope.yaml
```

Every runner also supports `doctor` (readiness) and `list-tools`.

## Two ways to run them

You chose **both** runtimes:

1. **Standalone Python** (above) — portable; run from any terminal, a cron job, or CI.
2. **Claude Code subagents** — `.claude/agents/red-team.md` and `blue-team.md` let you drive the same framework from inside Claude Code (`@red-team assess engagements/myhomelab/scope.yaml`). They wrap the Python engine and honor the same scope.

## What the agents can do

**Red team** — recon (`http_fingerprint`, `http_security_headers`, `tls_inspect`, `tcp_port_scan`/`nmap_scan`), web detection (`exposed_paths_probe`, `nuclei_scan`, `nikto_scan`), repository assessment (`secret_scan`, `gitleaks_scan`, `dependency_audit`, `semgrep_scan`), and gated active exploitation (`sqlmap_test`, `web_exploit_verify`, `known_cve_verify`).

**Blue team** — `propose_remediation`, `generate_hardening` (nginx headers, TLS, sshd, CSP, firewall, fail2ban, docker, postgres), `verify_fix` (re-tests to confirm closure), `update_finding_status`, `write_report`.

Missing a scanner? Every adapter **degrades gracefully** — the pure-Python tools (headers, TLS, ports, exposed paths, secret scanning) find real issues with zero external installs; the rest tell you how to install them.

## Adaptivity

The engine gives Claude the objective, the scope, the current findings, and the tool set, then loops: the model picks a tool, reads the result, and decides the next move — pivoting toward what looks promising. It is not a fixed checklist. Adaptivity never escapes the scope, because the Guard authorizes each requested tool call independently; a denied call is returned to the model as feedback so it adapts *within bounds*.

## Safety model (summary)

- **Fail closed.** No target is touched unless the scope is authorized, attested, unexpired, and the target is explicitly in-scope and not excluded.
- **Always prohibited**, in every mode: denial-of-service/volumetric, destructive/data-wiping actions, mass/untargeted scanning, ransomware/worm behavior. There is no bypass flag.
- **Active exploitation** runs only when `rules.active_exploitation: true`, and even then destructive post-exploitation options are refused.
- **Accountable.** Every decision and action is in `audit.jsonl`.

Read [RULES_OF_ENGAGEMENT.md](RULES_OF_ENGAGEMENT.md) before your first run.

## Layout

```
core/            shared engine: scope, authorization, engine, tooling, findings, reporting
  tools/         tool adapters (recon, web, exploit, repo, remediation, hardening)
red-team/        offensive agent: run.py, prompts/, playbooks/
blue-team/       defensive agent: run.py, prompts/, playbooks/
setup/           install.sh, bootstrap.py
engagements/     per-engagement scope + results (example/ is the template)
.claude/agents/  Claude Code subagent wrappers
tests/           unit tests for the safety-critical core
docs/            architecture and extension notes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to add a tool or a hardening template.
