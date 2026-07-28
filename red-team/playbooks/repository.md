# Red Team Playbook — Source Repositories

For code repos in scope (a local checkout path, or a git URL you clone first). Assessment is static and local — no target is contacted.

## 1. Secrets
- `secret_scan` (pure-Python) — hardcoded API keys, private keys, tokens, passwords across the working tree.
- `gitleaks_scan` — extends this into **git history** (secrets committed then "removed" are still in history).
- Any real secret is typically **high/critical**: it must be rotated, not just deleted.

## 2. Dependencies
- `dependency_audit` — identify manifests (`requirements.txt`, `package.json`, `go.mod`, `pom.xml`, lockfiles) and, with trivy installed, match known-vulnerable versions to CVEs.
- Prioritize direct, internet-exposed, and known-exploited (KEV) dependencies.

## 3. Code-level vulnerabilities
- `semgrep_scan` (auto ruleset) — injection sinks, unsafe deserialization, weak crypto, SSRF, path traversal, hardcoded config.
- Cross-reference semgrep hits with the app's actual attack surface (a sink reachable from user input matters more than one that isn't).

## 4. Repo hygiene (context for findings)
- `.env` / config files committed to the repo.
- CI/CD secrets in workflow files.
- Overly permissive tokens or long-lived credentials.

## 5. Record
`record_finding` per issue with `category` = `secrets` / `dependency` / `code`, the `file:line` as target, and the matched evidence (redacted). For secrets, always include the remediation "rotate immediately." Hand off to Blue Team.

> Repos must be listed in scope. Clone a remote repo locally first, then point the tools at the checkout path.
