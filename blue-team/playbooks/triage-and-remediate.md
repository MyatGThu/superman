# Blue Team Playbook — Triage & Remediation

Turn findings into verified fixes. Work worst-first (`list_findings`).

## 1. Triage each finding
- **Confirm it's real** in this environment (not a generic template match). Mark false positives with `update_finding_status` → `false_positive`.
- **Assess true impact:** is the affected asset internet-facing? Does it hold sensitive data? Is there a known exploit in the wild (KEV)?
- **Prioritize:** CVSS + exposure + business context. A medium on a public login page can outrank a high on an internal-only box.

## 2. Produce a concrete fix
Use `propose_remediation` with the *specific* action, not generic advice:

| Finding class | Concrete remediation |
| --- | --- |
| Missing security header | The exact header + value (see `generate_hardening nginx-security-headers`) |
| Weak/expired TLS | Renew cert; apply `generate_hardening tls-config`; automate renewal (ACME) |
| Exposed `.git`/`.env`/backup | Block the path at the web server; remove the file; **rotate** anything it leaked |
| Exposed datastore (Redis/Mongo/ES) | Bind to localhost/VPN, require auth, firewall the port |
| Cleartext service (telnet/ftp) | Replace with SSH/SFTP; disable the cleartext daemon |
| SQL injection | Parameterized queries; input validation; least-privilege DB user |
| Vulnerable dependency | Upgrade to the fixed version; enable automated dependency updates |
| Hardcoded secret | Rotate the secret; move to a secret manager/env var; purge from git history |

## 3. Generate hardening artifacts
`generate_hardening <template>` writes a ready-to-apply file to `engagements/<name>/hardening/`. Templates: `nginx-security-headers`, `tls-config`, `sshd-hardening`, `csp-policy`, `ufw-firewall`, `fail2ban`, `docker-hardening`, `postgres-hardening`.

## 4. Verify
`verify_fix <finding_id>` re-tests the target read-only and flips the finding to `verified` if it no longer reproduces. **An unverified fix is not a fix.** Some fixes need operator action first (rotate a credential, apply a vendor patch, restart a service) — say so explicitly; don't imply it's done.

## 5. Report
`write_report` → `engagements/<name>/report.md`. Summarize: fixed & verified, needs operator action, and prioritized next steps.
