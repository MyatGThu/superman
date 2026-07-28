"""Shared HTTP helper and the meta-tools (record/list findings, notes)."""

from __future__ import annotations

import socket
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass

from ..findings import Finding, Severity
from ..tooling import ToolAdapter, ToolContext, ToolResult

USER_AGENT = "superman-security/0.1 (authorized-testing)"


@dataclass
class HttpResponse:
    ok: bool
    status: int
    headers: dict[str, str]
    body: str
    final_url: str
    error: str = ""


def http_fetch(
    url: str,
    method: str = "GET",
    timeout: int = 15,
    allow_insecure: bool = False,
    max_body: int = 20000,
    headers: dict | None = None,
) -> HttpResponse:
    """Fetch a URL with stdlib only. Non-destructive: GET/HEAD by default.

    Follows redirects (urllib default). TLS verification on unless the caller
    opts out (recon of misconfigured hosts sometimes needs allow_insecure).
    """
    ctx = ssl.create_default_context()
    if allow_insecure:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read(max_body).decode("utf-8", "replace")
            hdrs = {k.lower(): v for k, v in resp.headers.items()}
            return HttpResponse(True, resp.status, hdrs, body, resp.geturl())
    except urllib.error.HTTPError as e:
        hdrs = {k.lower(): v for k, v in (e.headers.items() if e.headers else [])}
        body = ""
        try:
            body = e.read(max_body).decode("utf-8", "replace")
        except Exception:
            pass
        return HttpResponse(True, e.code, hdrs, body, url)
    except (urllib.error.URLError, ssl.SSLError, socket.timeout, ConnectionError, OSError) as e:
        return HttpResponse(False, 0, {}, "", url, error=str(e))


class RecordFinding(ToolAdapter):
    name = "record_finding"
    category = "meta"
    description = (
        "Record a concrete security finding you have established. Use this whenever a tool result or "
        "your own analysis reveals a real issue (a vulnerability, misconfiguration, exposed secret, etc.). "
        "Be specific and include evidence."
    )
    parameters = {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Short finding title, e.g. 'Missing HSTS header'"},
            "severity": {"type": "string", "enum": ["info", "low", "medium", "high", "critical"]},
            "target": {"type": "string", "description": "The affected host, URL, or repo"},
            "category": {"type": "string", "description": "web | network | tls | secrets | auth | config | dependency | code | misc"},
            "description": {"type": "string"},
            "evidence": {"type": "string", "description": "Observed proof: request/response snippet, banner, path, etc."},
            "remediation": {"type": "string", "description": "How to fix it (fill in if known)"},
            "cve": {"type": "string"},
            "cvss": {"type": "number"},
            "references": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["title", "severity", "target"],
    }

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        f = Finding(
            title=params["title"],
            severity=Severity(params.get("severity", "info")),
            target=params["target"],
            category=params.get("category", "misc"),
            description=params.get("description", ""),
            evidence=params.get("evidence", ""),
            remediation=params.get("remediation", ""),
            cve=params.get("cve", ""),
            cvss=params.get("cvss"),
            references=list(params.get("references", [])),
        )
        return ToolResult(tool=self.name, target=f.target, summary=f"Recorded {f.severity.value} finding: {f.title}", findings=[f])


class ListFindings(ToolAdapter):
    name = "list_findings"
    category = "meta"
    description = "List the findings recorded so far in this engagement, most severe first."
    parameters = {"type": "object", "properties": {
        "min_severity": {"type": "string", "enum": ["info", "low", "medium", "high", "critical"]}}}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        minsev = Severity(params.get("min_severity", "info"))
        items = ctx.findings.by_severity(minsev)
        lines = [f"[{f.severity.value.upper()}] {f.id} {f.title} — {f.target} (status={f.status.value})" for f in items]
        return ToolResult(tool=self.name, summary=f"{len(items)} finding(s)", output="\n".join(lines) or "(none)")


class Note(ToolAdapter):
    name = "note"
    category = "meta"
    description = "Record a free-form note in the audit log (reasoning, decisions, next steps). No target contact."
    parameters = {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        ctx.audit.note("agent_note", {"text": params.get("text", "")})
        return ToolResult(tool=self.name, summary="noted")
