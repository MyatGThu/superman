"""A small library of concrete hardening artifacts the blue team can emit.

Each template renders to a config/policy the operator can drop in. Placeholders
like {domain} and {origins} are filled from the supplied context (with safe
defaults). These are starting points aligned with common baselines (Mozilla TLS,
OWASP secure headers, CIS-style SSH), not a substitute for review.
"""

from __future__ import annotations

_NGINX_HEADERS = """# Security headers for {domain} — include inside your server{{}} block.
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Redirect all HTTP to HTTPS
server {{
    listen 80;
    server_name {domain};
    return 301 https://$host$request_uri;
}}
"""

_TLS = """# Mozilla "intermediate" TLS for {domain} (nginx). Disables TLS < 1.2.
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_stapling on;
ssl_stapling_verify on;
"""

_SSHD = """# Hardened sshd_config (CIS-aligned). Review before applying; keep a session open.
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
Protocol 2
"""

_CSP = """Content-Security-Policy: default-src 'self'; script-src 'self'{origins}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
# Tighten from report-only first: Content-Security-Policy-Report-Only, then enforce.
"""

_UFW = """# Default-deny firewall with ufw. Adjust the allowed ports to your services.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp        # SSH — restrict to a source with: ufw allow from <ip> to any port 22
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
"""

_FAIL2BAN = """# /etc/fail2ban/jail.local — brute-force protection for SSH (and web if needed).
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
"""

_DOCKER = """# Docker hardening checklist (compose/service).
# - Run as non-root:            user: "1000:1000"
# - Drop capabilities:          cap_drop: [ALL]
# - Read-only root fs:          read_only: true
# - No new privileges:          security_opt: ["no-new-privileges:true"]
# - Limit resources:            mem_limit / cpus
# - Never mount the docker socket into an app container.
# - Pin image digests, scan images (trivy image <ref>), and keep base images updated.
"""

_POSTGRES = """# PostgreSQL hardening notes.
# postgresql.conf:
listen_addresses = 'localhost'        # or specific internal IPs, never 0.0.0.0 publicly
ssl = on
password_encryption = scram-sha-256
# pg_hba.conf: require scram-sha-256 (not trust/md5) for all non-local connections.
# Create least-privilege roles per app; never let apps use the superuser.
"""

HARDENING_TEMPLATES = {
    "nginx-security-headers": {"filename": "nginx-security-headers.conf", "body": _NGINX_HEADERS},
    "tls-config": {"filename": "tls-intermediate.conf", "body": _TLS},
    "sshd-hardening": {"filename": "sshd_config.hardened", "body": _SSHD},
    "csp-policy": {"filename": "content-security-policy.txt", "body": _CSP},
    "ufw-firewall": {"filename": "ufw-setup.sh", "body": _UFW},
    "fail2ban": {"filename": "jail.local", "body": _FAIL2BAN},
    "docker-hardening": {"filename": "docker-hardening.md", "body": _DOCKER},
    "postgres-hardening": {"filename": "postgres-hardening.conf", "body": _POSTGRES},
}


def render_hardening(name: str, context: dict) -> str:
    body = HARDENING_TEMPLATES[name]["body"]
    ctx = {"domain": "example.com", "origins": ""}
    ctx.update({k: str(v) for k, v in (context or {}).items()})
    try:
        return body.format(**ctx)
    except (KeyError, IndexError, ValueError):
        return body  # if a template has literal braces we didn't escape, emit as-is
