"""Web reconnaissance adapters (pure Python, no external binaries required).

These are non-destructive: they make a small number of ordinary requests and
inspect what comes back. Useful against any http(s) target and safe to run in
almost any engagement.
"""

from __future__ import annotations

import socket
import ssl
from datetime import datetime, timezone
from urllib.parse import urlparse

from ..findings import Finding, Severity
from ..tooling import ToolAdapter, ToolContext, ToolResult
from .common import http_fetch

# Recommended security headers and the severity of their absence.
SECURITY_HEADERS = {
    "strict-transport-security": (Severity.MEDIUM, "Enforces HTTPS; prevents SSL-strip / downgrade."),
    "content-security-policy": (Severity.MEDIUM, "Mitigates XSS and data injection."),
    "x-content-type-options": (Severity.LOW, "Should be 'nosniff' to stop MIME sniffing."),
    "x-frame-options": (Severity.LOW, "Prevents clickjacking (or use CSP frame-ancestors)."),
    "referrer-policy": (Severity.INFO, "Controls referrer leakage."),
    "permissions-policy": (Severity.INFO, "Restricts powerful browser features."),
}
# Headers that leak stack detail.
DISCLOSURE_HEADERS = ("server", "x-powered-by", "x-aspnet-version", "x-runtime", "via")


def _url(target: str) -> str:
    return target if target.startswith(("http://", "https://")) else f"https://{target}"


class SecurityHeaders(ToolAdapter):
    name = "http_security_headers"
    category = "web"
    target_param = "url"
    description = ("Fetch a URL and analyze HTTP response security headers (HSTS, CSP, X-Frame-Options, "
                   "cookie flags, information disclosure). Non-destructive.")
    parameters = {"type": "object", "properties": {
        "url": {"type": "string", "description": "Target URL or host"}}, "required": ["url"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        url = _url(params["url"])
        resp = http_fetch(url, allow_insecure=True)
        if not resp.ok and resp.status == 0:
            return ToolResult(self.name, ok=False, target=url, summary=f"could not connect: {resp.error}")
        findings: list[Finding] = []
        h = resp.headers
        for name, (sev, why) in SECURITY_HEADERS.items():
            if name not in h:
                findings.append(Finding(
                    title=f"Missing security header: {name}", severity=sev, target=url, category="web",
                    description=why, evidence=f"HTTP {resp.status}; header '{name}' absent",
                    remediation=f"Set the '{name}' response header.",
                    references=["https://owasp.org/www-project-secure-headers/"]))
        for name in DISCLOSURE_HEADERS:
            if name in h:
                findings.append(Finding(
                    title=f"Information disclosure via '{name}' header", severity=Severity.LOW, target=url,
                    category="config", description="Response header reveals server/framework details.",
                    evidence=f"{name}: {h[name]}", remediation=f"Suppress or genericize the '{name}' header."))
        cookies = resp.headers.get("set-cookie", "")
        if cookies:
            low = cookies.lower()
            if "secure" not in low:
                findings.append(Finding("Cookie without Secure flag", Severity.MEDIUM, url, "web",
                                        evidence=cookies[:200], remediation="Add the Secure attribute to cookies."))
            if "httponly" not in low:
                findings.append(Finding("Cookie without HttpOnly flag", Severity.MEDIUM, url, "web",
                                        evidence=cookies[:200], remediation="Add the HttpOnly attribute to session cookies."))
        summary = f"HTTP {resp.status} on {resp.final_url}: {len(findings)} header issue(s)"
        detail = "Response headers:\n" + "\n".join(f"  {k}: {v}" for k, v in sorted(h.items()))
        return ToolResult(self.name, target=url, summary=summary, output=detail, findings=findings)


class TlsInspect(ToolAdapter):
    name = "tls_inspect"
    category = "tls"
    target_param = "host"
    description = ("Inspect a host's TLS certificate and negotiated protocol: expiry, hostname match, "
                   "self-signed, and weak protocol versions. Non-destructive.")
    parameters = {"type": "object", "properties": {
        "host": {"type": "string"}, "port": {"type": "integer", "default": 443}}, "required": ["host"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        raw = params["host"]
        host = urlparse(raw).hostname or raw.split("/")[0].split(":")[0]
        port = int(params.get("port", 443))
        findings: list[Finding] = []
        target = f"{host}:{port}"
        # 1) verified handshake
        try:
            vctx = ssl.create_default_context()
            with socket.create_connection((host, port), timeout=10) as sock:
                with vctx.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()
                    proto = ssock.version()
            verified = True
        except ssl.SSLCertVerificationError as e:
            verified = False
            findings.append(Finding("TLS certificate verification failed", Severity.HIGH, target, "tls",
                                    evidence=str(e), remediation="Install a valid, trusted certificate matching the hostname."))
            cert, proto = self._unverified(host, port)
        except (socket.timeout, ConnectionError, OSError) as e:
            return ToolResult(self.name, ok=False, target=target, summary=f"TLS connect failed: {e}")

        if proto in ("TLSv1", "TLSv1.1", "SSLv3"):
            findings.append(Finding(f"Weak TLS protocol negotiated: {proto}", Severity.MEDIUM, target, "tls",
                                    evidence=f"negotiated {proto}", remediation="Disable TLS < 1.2; prefer TLS 1.3."))
        if cert:
            na = cert.get("notAfter")
            if na:
                try:
                    exp = datetime.strptime(na, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
                    days = (exp - datetime.now(timezone.utc)).days
                    if days < 0:
                        findings.append(Finding("Expired TLS certificate", Severity.HIGH, target, "tls",
                                                evidence=f"expired {na} ({-days}d ago)", remediation="Renew the certificate."))
                    elif days < 21:
                        findings.append(Finding("TLS certificate expiring soon", Severity.LOW, target, "tls",
                                                evidence=f"expires {na} ({days}d)", remediation="Renew before expiry / automate renewal."))
                except ValueError:
                    pass
        summary = f"{target}: proto={proto} verified={verified} issues={len(findings)}"
        return ToolResult(self.name, target=target, summary=summary, output=str(cert)[:2000], findings=findings)

    @staticmethod
    def _unverified(host: str, port: int):
        try:
            ictx = ssl.create_default_context()
            ictx.check_hostname = False
            ictx.verify_mode = ssl.CERT_NONE
            with socket.create_connection((host, port), timeout=10) as sock:
                with ictx.wrap_socket(sock, server_hostname=host) as ssock:
                    return ssock.getpeercert(binary_form=False) or {}, ssock.version()
        except Exception:
            return {}, "unknown"


class HttpFingerprint(ToolAdapter):
    name = "http_fingerprint"
    category = "web"
    target_param = "host"
    description = ("Identify server/framework, redirects, and whether the site enforces HTTPS. "
                   "Fetches the root over http and https. Non-destructive.")
    parameters = {"type": "object", "properties": {"host": {"type": "string"}}, "required": ["host"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        raw = params["host"]
        host = urlparse(raw).hostname or raw.split("/")[0]
        findings: list[Finding] = []
        lines = []
        https = http_fetch(f"https://{host}", allow_insecure=True)
        http = http_fetch(f"http://{host}")
        if https.ok:
            lines.append(f"https -> {https.status} server={https.headers.get('server','?')} powered={https.headers.get('x-powered-by','?')}")
        if http.ok:
            lines.append(f"http  -> {http.status} location={http.headers.get('location','(none)')}")
            loc = http.headers.get("location", "")
            if not (http.status in (301, 302, 307, 308) and loc.startswith("https")):
                if https.ok:
                    findings.append(Finding("HTTP not redirected to HTTPS", Severity.MEDIUM, host, "web",
                                            evidence=f"http returned {http.status}, location={loc or '(none)'}",
                                            remediation="Redirect all http traffic to https (301) and enable HSTS."))
        summary = f"{host}: " + "; ".join(lines) if lines else f"{host}: no response"
        return ToolResult(self.name, target=host, summary=summary, output="\n".join(lines), findings=findings)
