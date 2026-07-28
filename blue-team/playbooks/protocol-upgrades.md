# Blue Team Playbook — Protocol Upgrades (Defense-in-Depth)

Fixing individual findings closes holes. **Upgrading protocols** stops the whole class from recurring. After remediating, recommend the standing controls below (matched to what the engagement revealed).

## Web / application
- Enforce HTTPS + HSTS (preload) everywhere; redirect all HTTP.
- Ship a real Content-Security-Policy (start report-only, then enforce).
- Set secure cookie flags (`Secure`, `HttpOnly`, `SameSite`) by default.
- Put a WAF / rate limiting in front of auth and API endpoints.
- Centralize security headers in the reverse proxy so every app inherits them.

## Identity & access
- MFA on all admin and remote access.
- SSH: keys only, no root login, `fail2ban` (see hardening templates).
- Least privilege for app/database/service accounts; no shared superusers.
- Rotate credentials on a schedule and immediately on any exposure.

## Network
- Default-deny firewall (`ufw-firewall` template); expose only what must be public.
- Databases and admin interfaces on localhost/VPN, never the public internet.
- Segment the homelab/LAN so a compromised host can't reach everything.

## Secrets
- A secret manager (Vault, cloud KMS, or at minimum `.env` outside the repo).
- Pre-commit secret scanning (gitleaks) + CI secret scanning to stop new leaks.
- Treat every leaked secret as compromised → rotate.

## Dependencies & code
- Automated dependency updates (Dependabot/Renovate) + CI vulnerability scanning (trivy).
- SAST in CI (semgrep) on every PR.
- Pin and verify base images; scan images before deploy.

## Monitoring & response
- Centralized logging for auth, web, and firewall events.
- Alert on the specific patterns this engagement surfaced (e.g. repeated auth failures, access to sensitive paths).
- A written incident-response runbook and a tested backup/restore.

## Cadence
- Re-run this red/blue engagement on a schedule (quarterly, or after major changes).
- Track findings over time in `findings.json`; a regression is a fix that didn't hold.

Fold the relevant items into the report's closing "Protocol Upgrades" section so the operator has a concrete roadmap, not just a patch list.
