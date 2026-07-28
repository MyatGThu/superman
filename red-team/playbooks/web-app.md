# Red Team Playbook — Web Applications & Websites

For portfolios, marketing sites, SaaS apps, and any HTTP(S) target in scope.

## 1. Reconnaissance
- `http_fingerprint` — server/framework, HTTP→HTTPS enforcement, redirects.
- `http_security_headers` — HSTS, CSP, X-Frame-Options, cookie flags, info-disclosure headers.
- `tls_inspect` — protocol version, cert validity/expiry, hostname match.
- `tcp_port_scan` (or `nmap_scan`) — what else is listening on the host besides 80/443.

## 2. Surface enumeration
- `exposed_paths_probe` — `.git`, `.env`, backups, `server-status`, Spring `actuator`, `phpinfo`, `.DS_Store`. Add app-specific paths via `extra_paths`.
- `nuclei_scan` — known CVEs, default credentials, exposed panels, misconfigurations (detection).
- `nikto_scan` — dangerous files, outdated servers, server misconfig.
- Note interesting parameters, login flows, upload endpoints, and API routes for the next phase.

## 3. Vulnerability identification (map to OWASP Top 10)
- Broken access control — can you reach admin/other-user resources? (record, don't pivot out of scope)
- Injection — parameters reflected into SQL/OS/templates.
- Security misconfiguration — verbose errors, directory listing, debug endpoints.
- Vulnerable components — versions from fingerprinting → known CVEs.
- Auth failures — weak/lockout-free login, session fixation, missing MFA.

## 4. Verification (only if `active_exploitation: true`)
- `known_cve_verify` — confirm a specific CVE actually affects this target (proof, not weaponization).
- `sqlmap_test` — confirm SQL injection on a suspicious parameter (level≤2/risk≤1; destructive options refused).
- `web_exploit_verify` — nuclei high/critical templates to confirm exploitability.
- Capture the **minimum** evidence that proves impact. Do not dump data, take shells, or persist.

## 5. Record
For each real issue call `record_finding` with an accurate severity, the affected URL, and evidence (request/response snippet, matched template, confirmed injection). Prefer CVSS when known. Then summarize and hand off to Blue Team.

**Stay in bounds:** if a call is DENIED, pick another in-scope action. Never DoS, never touch out-of-scope hosts.
