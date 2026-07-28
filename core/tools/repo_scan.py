"""Source-repository assessment.

- SecretRegexScan: pure-Python walk of a checkout looking for hardcoded secrets
  (API keys, private keys, tokens). Works with no external tools.
- GitleaksScan / SemgrepScan: wrap those scanners when installed.
- DependencyAudit: identify dependency manifests and, if a vuln scanner is
  present (trivy / pip-audit / npm), report known-vulnerable dependencies.

All of these operate on a repository path or URL that must be in scope.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from ..findings import Finding, Severity
from ..tooling import ToolAdapter, ToolContext, ToolResult, safe_run

SECRET_PATTERNS = [
    ("AWS access key id", re.compile(r"AKIA[0-9A-Z]{16}"), Severity.CRITICAL),
    ("AWS secret access key", re.compile(r"(?i)aws_secret_access_key\s*[=:]\s*['\"]?[A-Za-z0-9/+=]{40}"), Severity.CRITICAL),
    ("Private key block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"), Severity.CRITICAL),
    ("Google API key", re.compile(r"AIza[0-9A-Za-z\-_]{35}"), Severity.HIGH),
    ("Slack token", re.compile(r"xox[baprs]-[0-9A-Za-z-]{10,}"), Severity.HIGH),
    ("GitHub token", re.compile(r"gh[pousr]_[0-9A-Za-z]{36,}"), Severity.HIGH),
    ("Stripe secret key", re.compile(r"sk_live_[0-9a-zA-Z]{24,}"), Severity.HIGH),
    ("JWT", re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"), Severity.MEDIUM),
    ("Generic secret assignment", re.compile(r"(?i)(password|passwd|secret|api[_-]?key|token)\s*[=:]\s*['\"][^'\"]{8,}['\"]"), Severity.MEDIUM),
]
SKIP_DIRS = {".git", "node_modules", "vendor", "dist", "build", ".venv", "venv", "__pycache__", ".mypy_cache"}
SKIP_EXT = {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".gz", ".tar", ".jar", ".woff", ".woff2", ".ico", ".mp4", ".so", ".bin"}
MANIFESTS = {
    "requirements.txt": "pip", "poetry.lock": "poetry", "Pipfile.lock": "pipenv",
    "package.json": "npm", "package-lock.json": "npm", "yarn.lock": "yarn",
    "go.mod": "go", "Gemfile.lock": "bundler", "pom.xml": "maven", "build.gradle": "gradle",
    "Cargo.lock": "cargo", "composer.lock": "composer",
}


def _repo_path(raw: str) -> Path | None:
    p = Path(raw)
    return p if p.exists() and p.is_dir() else None


class SecretRegexScan(ToolAdapter):
    name = "secret_scan"
    category = "secrets"
    target_param = "repo"
    description = ("Scan a local repository checkout for hardcoded secrets (API keys, private keys, tokens) "
                   "using regex signatures. Pure-Python; no external tools needed.")
    parameters = {"type": "object", "properties": {
        "repo": {"type": "string", "description": "Path to a local repository checkout"},
        "max_files": {"type": "integer", "default": 5000}}, "required": ["repo"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        root = _repo_path(params["repo"])
        if root is None:
            return ToolResult(self.name, ok=False, target=params["repo"],
                              summary=f"not a local directory: {params['repo']} (clone it first)")
        findings: list[Finding] = []
        scanned = 0
        cap = int(params.get("max_files", 5000))
        for path in root.rglob("*"):
            if scanned >= cap:
                break
            if path.is_dir() or any(part in SKIP_DIRS for part in path.parts) or path.suffix.lower() in SKIP_EXT:
                continue
            try:
                if path.stat().st_size > 1_000_000:
                    continue
                text = path.read_text("utf-8", "ignore")
            except (OSError, ValueError):
                continue
            scanned += 1
            for label, pattern, sev in SECRET_PATTERNS:
                m = pattern.search(text)
                if m:
                    rel = path.relative_to(root)
                    line = text[: m.start()].count("\n") + 1
                    findings.append(Finding(
                        title=f"Hardcoded secret: {label}", severity=sev, target=f"{rel}:{line}", category="secrets",
                        evidence=f"{rel}:{line}  match={_redact(m.group(0))}",
                        remediation="Remove the secret from source, rotate it, and load it from a secret manager / env var.",
                        references=["https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password"]))
        return ToolResult(self.name, target=str(root),
                          summary=f"{root}: {len(findings)} potential secret(s) in {scanned} files",
                          output="\n".join(f.evidence for f in findings) or "(none)", findings=findings)


class GitleaksScan(ToolAdapter):
    name = "gitleaks_scan"
    category = "secrets"
    target_param = "repo"
    requires = ("gitleaks",)
    description = "Run gitleaks over a repository (including git history) to detect leaked secrets."
    parameters = {"type": "object", "properties": {"repo": {"type": "string"}}, "required": ["repo"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("repo", ""))
        root = _repo_path(params["repo"])
        if root is None:
            return ToolResult(self.name, ok=False, target=params["repo"], summary="not a local directory")
        out = root / ".superman-gitleaks.json"
        res = safe_run(["gitleaks", "detect", "--source", str(root), "--report-format", "json",
                        "--report-path", str(out), "--no-banner", "--exit-code", "0"],
                       timeout=ctx.settings.tool_timeout)
        if res.not_found:
            return self._unavailable(str(root))
        findings = []
        try:
            data = json.loads(out.read_text()) if out.exists() else []
            for item in data:
                findings.append(Finding(
                    title=f"gitleaks: {item.get('RuleID', 'secret')}", severity=Severity.HIGH,
                    target=f"{item.get('File','?')}:{item.get('StartLine','?')}", category="secrets",
                    evidence=f"{item.get('Description','')} commit={item.get('Commit','')[:10]}",
                    remediation="Rotate the leaked secret and purge it from git history."))
        finally:
            out.unlink(missing_ok=True)
        return ToolResult(self.name, target=str(root), summary=f"gitleaks: {len(findings)} leak(s)", findings=findings)


class DependencyAudit(ToolAdapter):
    name = "dependency_audit"
    category = "dependency"
    target_param = "repo"
    description = ("Identify dependency manifests in a repo and, if a vulnerability scanner (trivy/pip-audit/npm) "
                   "is installed, report known-vulnerable dependencies. Otherwise lists manifests to audit.")
    parameters = {"type": "object", "properties": {"repo": {"type": "string"}}, "required": ["repo"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        root = _repo_path(params["repo"])
        if root is None:
            return ToolResult(self.name, ok=False, target=params["repo"], summary="not a local directory")
        found = []
        for name, eco in MANIFESTS.items():
            for hit in root.rglob(name):
                if not any(p in SKIP_DIRS for p in hit.parts):
                    found.append((eco, hit.relative_to(root)))
        import shutil
        findings: list[Finding] = []
        detail = ["Manifests: " + (", ".join(f"{e}:{p}" for e, p in found) or "(none)")]
        if shutil.which("trivy"):
            res = safe_run(["trivy", "fs", "--scanners", "vuln", "--quiet", "--format", "json", str(root)],
                           timeout=ctx.settings.tool_timeout)
            findings += _parse_trivy(res.stdout, str(root))
            detail.append(f"trivy rc={res.returncode}, {len(findings)} vulnerable dependency finding(s)")
        else:
            detail.append("No dependency vuln scanner installed (install trivy for CVE matching; see setup/install.sh).")
        return ToolResult(self.name, target=str(root),
                          summary=f"{root}: {len(found)} manifest(s), {len(findings)} vuln finding(s)",
                          output="\n".join(detail), findings=findings)


class SemgrepScan(ToolAdapter):
    name = "semgrep_scan"
    category = "code"
    target_param = "repo"
    requires = ("semgrep",)
    description = "Run semgrep static analysis (default 'auto' ruleset) over a repository for code-level vulns."
    parameters = {"type": "object", "properties": {"repo": {"type": "string"}}, "required": ["repo"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("repo", ""))
        root = _repo_path(params["repo"])
        if root is None:
            return ToolResult(self.name, ok=False, target=params["repo"], summary="not a local directory")
        res = safe_run(["semgrep", "--config", "auto", "--json", "--quiet", str(root)],
                       timeout=ctx.settings.tool_timeout)
        if res.not_found:
            return self._unavailable(str(root))
        findings = []
        try:
            for r in json.loads(res.stdout or "{}").get("results", []):
                sev = {"ERROR": Severity.HIGH, "WARNING": Severity.MEDIUM}.get(
                    r.get("extra", {}).get("severity", "INFO"), Severity.LOW)
                findings.append(Finding(
                    title=f"semgrep: {r.get('check_id','')[:80]}", severity=sev,
                    target=f"{r.get('path','?')}:{r.get('start',{}).get('line','?')}", category="code",
                    evidence=r.get("extra", {}).get("message", "")[:300],
                    remediation="Review and fix per the semgrep rule guidance."))
        except (json.JSONDecodeError, KeyError):
            pass
        return ToolResult(self.name, target=str(root), summary=f"semgrep: {len(findings)} finding(s)", findings=findings)


def _parse_trivy(stdout: str, target: str) -> list[Finding]:
    out = []
    try:
        for res in json.loads(stdout or "{}").get("Results", []) or []:
            for v in res.get("Vulnerabilities", []) or []:
                out.append(Finding(
                    title=f"{v.get('PkgName','?')} {v.get('InstalledVersion','')}: {v.get('VulnerabilityID','')}",
                    severity=Severity(str(v.get("Severity", "low")).lower()) if str(v.get("Severity", "")).lower()
                    in ("info", "low", "medium", "high", "critical") else Severity.MEDIUM,
                    target=f"{target}:{v.get('PkgName','?')}", category="dependency",
                    cve=v.get("VulnerabilityID", ""),
                    evidence=f"{v.get('PkgName')} {v.get('InstalledVersion')} < {v.get('FixedVersion','?')}",
                    remediation=f"Upgrade {v.get('PkgName')} to {v.get('FixedVersion','a fixed version')}."))
    except (json.JSONDecodeError, KeyError):
        pass
    return out


def _redact(s: str) -> str:
    return s[:6] + "…" + s[-2:] if len(s) > 12 else "…"
