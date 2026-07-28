"""Web vulnerability detection.

- ExposedPathsProbe: pure-Python, GET-only probe for a curated list of commonly
  exposed sensitive files/endpoints (.git, .env, backups, status pages). Safe
  and useful with no external tools.
- NucleiScan / NikitoScan: wrap the well-known scanners when installed. These
  are *detection* scanners (active=False); they identify issues rather than
  weaponize them. Rate-limited and bounded.
"""

from __future__ import annotations

from ..findings import Finding, Severity
from ..tooling import ToolAdapter, ToolContext, ToolResult, safe_run
from .common import http_fetch

# path -> (severity, signature substring that confirms a true positive, description)
SENSITIVE_PATHS = {
    "/.git/HEAD": (Severity.HIGH, "ref:", "Exposed .git directory — source code and history may be downloadable."),
    "/.env": (Severity.CRITICAL, "=", "Exposed .env file may leak secrets/credentials."),
    "/.aws/credentials": (Severity.CRITICAL, "aws_access_key", "Exposed AWS credentials file."),
    "/config.php.bak": (Severity.HIGH, "<?php", "Exposed PHP config backup."),
    "/wp-config.php.bak": (Severity.HIGH, "DB_PASSWORD", "Exposed WordPress config backup."),
    "/server-status": (Severity.MEDIUM, "Apache Server Status", "Apache mod_status exposed."),
    "/actuator/env": (Severity.HIGH, "propertySources", "Spring Boot actuator env exposed."),
    "/phpinfo.php": (Severity.MEDIUM, "phpinfo()", "phpinfo() exposed — reveals config."),
    "/.svn/entries": (Severity.MEDIUM, "", "Exposed .svn metadata."),
    "/.DS_Store": (Severity.LOW, "", "Exposed .DS_Store may reveal file listing."),
    "/backup.sql": (Severity.HIGH, "", "Exposed database dump."),
    "/robots.txt": (Severity.INFO, "", "robots.txt (informational — may reveal hidden paths)."),
    "/.well-known/security.txt": (Severity.INFO, "", "security.txt present (informational)."),
}


def _base(url: str) -> str:
    u = url if url.startswith(("http://", "https://")) else f"https://{url}"
    return u.rstrip("/")


class ExposedPathsProbe(ToolAdapter):
    name = "exposed_paths_probe"
    category = "web"
    description = ("GET a curated list of commonly-exposed sensitive paths (.git, .env, backups, status/actuator "
                   "endpoints) and report which are reachable. Read-only and non-destructive.")
    parameters = {"type": "object", "properties": {
        "url": {"type": "string", "description": "Base URL of the web app"},
        "extra_paths": {"type": "array", "items": {"type": "string"}, "description": "Optional extra paths to check."}},
        "required": ["url"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        base = _base(params["url"])
        paths = dict(SENSITIVE_PATHS)
        for p in params.get("extra_paths", []) or []:
            paths.setdefault(p if p.startswith("/") else "/" + p, (Severity.MEDIUM, "", "User-specified path."))
        findings: list[Finding] = []
        checked = []
        for path, (sev, sig, desc) in paths.items():
            resp = http_fetch(base + path, allow_insecure=True, max_body=4000, timeout=10)
            if resp.ok and resp.status == 200 and (not sig or sig.lower() in resp.body.lower()):
                checked.append(f"{path} -> 200 (HIT)")
                if sev != Severity.INFO:
                    findings.append(Finding(
                        title=f"Exposed path: {path}", severity=sev, target=base + path, category="web",
                        description=desc, evidence=f"HTTP 200; body starts: {resp.body[:120]!r}",
                        remediation=f"Block public access to {path} (webserver rule / remove the file)."))
            elif resp.ok:
                checked.append(f"{path} -> {resp.status}")
        summary = f"{base}: {len(findings)} exposed sensitive path(s) of {len(paths)} checked"
        return ToolResult(self.name, target=base, summary=summary, output="\n".join(checked), findings=findings)


class NucleiScan(ToolAdapter):
    name = "nuclei_scan"
    category = "web"
    requires = ("nuclei",)
    description = ("Run nuclei detection templates against a URL (CVEs, misconfigurations, exposures). "
                   "Detection only; rate-limited. Requires nuclei installed.")
    parameters = {"type": "object", "properties": {
        "url": {"type": "string"},
        "severity": {"type": "string", "default": "low,medium,high,critical",
                     "description": "Comma list of severities to include."}},
        "required": ["url"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("url", ""))
        url = _base(params["url"])
        sev = params.get("severity", "low,medium,high,critical")
        res = safe_run(["nuclei", "-u", url, "-severity", sev, "-rate-limit", "50",
                        "-no-interactsh", "-silent", "-nc"], timeout=ctx.settings.tool_timeout)
        if res.not_found:
            return self._unavailable(url)
        lines = [ln for ln in res.stdout.splitlines() if ln.strip()]
        findings = []
        for ln in lines:
            low = ln.lower()
            sv = (Severity.CRITICAL if "[critical]" in low else Severity.HIGH if "[high]" in low
                  else Severity.MEDIUM if "[medium]" in low else Severity.LOW if "[low]" in low else Severity.INFO)
            findings.append(Finding(title=f"nuclei: {ln[:120]}", severity=sv, target=url, category="web",
                                    evidence=ln, remediation="Review the matched template's remediation guidance."))
        return ToolResult(self.name, target=url, summary=f"nuclei: {len(findings)} match(es)",
                          output=res.stdout or res.stderr, findings=findings)


class NikitoScan(ToolAdapter):
    name = "nikto_scan"
    category = "web"
    requires = ("nikto",)
    description = "Run a nikto web server scan (misconfigurations, dangerous files). Requires nikto installed."
    parameters = {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("url", ""))
        url = _base(params["url"])
        res = safe_run(["nikto", "-h", url, "-maxtime", "120s", "-ask", "no"], timeout=ctx.settings.tool_timeout)
        if res.not_found:
            return self._unavailable(url)
        return ToolResult(self.name, target=url, summary=f"nikto rc={res.returncode}",
                          output=res.stdout or res.stderr)
