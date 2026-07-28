"""Blue-team tools: triage, remediate, harden, verify, report.

These consume findings (from the red team or a prior scan) and drive them
toward closure. VerifyFix re-runs a read-only check to confirm a fix actually
worked — and it re-authorizes through the Guard before touching the target, so
verification stays inside scope just like everything else.
"""

from __future__ import annotations

from ..findings import Finding, Severity, Status
from ..reporting import write_report
from ..tooling import ToolAdapter, ToolContext, ToolResult
from .hardening import HARDENING_TEMPLATES, render_hardening
from .web_recon import SecurityHeaders, TlsInspect
from .web_vuln import ExposedPathsProbe
from .network_recon import TcpPortScan


class ProposeRemediation(ToolAdapter):
    name = "propose_remediation"
    category = "remediation"
    description = ("Attach or refine remediation guidance for a finding and mark it triaged. Optionally reprioritize "
                   "by supplying a CVSS score.")
    parameters = {"type": "object", "properties": {
        "finding_id": {"type": "string"},
        "remediation": {"type": "string"},
        "cvss": {"type": "number"},
        "note": {"type": "string"}}, "required": ["finding_id", "remediation"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        f = ctx.findings.get(params["finding_id"])
        if not f:
            return ToolResult(self.name, ok=False, summary=f"no finding with id {params['finding_id']}")
        f.remediation = params["remediation"]
        if params.get("cvss") is not None:
            f.cvss = float(params["cvss"])
            f.severity = Severity.from_cvss(f.cvss)
        if params.get("note"):
            f.notes.append(params["note"])
        f.status = Status.TRIAGED
        if ctx.findings.path:
            ctx.findings.save()
        return ToolResult(self.name, target=f.target, summary=f"triaged {f.id}: {f.title}")


class UpdateFindingStatus(ToolAdapter):
    name = "update_finding_status"
    category = "remediation"
    description = ("Set a finding's status: triaged, remediated, verified, accepted, or false_positive. "
                   "Use after applying or confirming a fix.")
    parameters = {"type": "object", "properties": {
        "finding_id": {"type": "string"},
        "status": {"type": "string", "enum": ["open", "triaged", "remediated", "verified", "accepted", "false_positive"]},
        "note": {"type": "string"}}, "required": ["finding_id", "status"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        f = ctx.findings.get(params["finding_id"])
        if not f:
            return ToolResult(self.name, ok=False, summary=f"no finding with id {params['finding_id']}")
        f.status = Status(params["status"])
        if params.get("note"):
            f.notes.append(params["note"])
        if ctx.findings.path:
            ctx.findings.save()
        return ToolResult(self.name, target=f.target, summary=f"{f.id} -> {f.status.value}")


class GenerateHardening(ToolAdapter):
    name = "generate_hardening"
    category = "remediation"
    description = ("Generate a concrete hardening artifact (config/policy) the operator can apply. Available "
                   f"templates: {', '.join(HARDENING_TEMPLATES)}. Written to the engagement workspace.")
    parameters = {"type": "object", "properties": {
        "template": {"type": "string", "enum": list(HARDENING_TEMPLATES)},
        "context": {"type": "object", "description": "Optional values (e.g. domain, allowed origins)."}},
        "required": ["template"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        name = params["template"]
        if name not in HARDENING_TEMPLATES:
            return ToolResult(self.name, ok=False, summary=f"unknown template '{name}'")
        content = render_hardening(name, params.get("context") or {})
        workspace = ctx.settings.workspace_for(ctx.scope.engagement) / "hardening"
        workspace.mkdir(parents=True, exist_ok=True)
        out = workspace / HARDENING_TEMPLATES[name]["filename"]
        out.write_text(content)
        return ToolResult(self.name, summary=f"generated {name} -> {out}", output=content[:3000])


class VerifyFix(ToolAdapter):
    name = "verify_fix"
    category = "remediation"
    description = ("Re-test a finding's target with a read-only check to confirm whether the issue is now resolved, "
                   "then update the finding to 'verified' if it no longer reproduces. Stays within scope.")
    parameters = {"type": "object", "properties": {"finding_id": {"type": "string"}}, "required": ["finding_id"]}

    _by_category = {
        "web": SecurityHeaders,
        "config": SecurityHeaders,
        "tls": TlsInspect,
        "network": TcpPortScan,
    }

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        f = ctx.findings.get(params["finding_id"])
        if not f:
            return ToolResult(self.name, ok=False, summary=f"no finding with id {params['finding_id']}")

        # Build the exact re-test call for this finding's category (see below),
        # then re-authorize the host we will actually contact before touching it.
        adapter, params_in, host = self._retest_for(f)
        from ..authorization import AuthorizationError
        try:
            ctx.guard.check("verify_fix", host, active=False, detail={"finding": f.id})
        except AuthorizationError as e:
            return ToolResult(self.name, ok=False, target=host, summary=f"cannot verify (out of scope now): {e}")

        result = adapter.run(params_in, ctx)
        # A failed/errored re-test must NOT be read as "fixed" — keep it open.
        if not result.ok and not result.findings:
            f.notes.append(f"verify_fix: re-test inconclusive ({result.summary})")
            summary = f"{f.id} NOT VERIFIED — re-test inconclusive"
        elif any(nf.title == f.title for nf in result.findings):
            f.notes.append("verify_fix: issue still reproduces")
            summary = f"{f.id} STILL PRESENT after re-test"
        else:
            f.status = Status.VERIFIED
            f.notes.append("verify_fix: no longer reproduces")
            summary = f"{f.id} VERIFIED fixed (no longer reproduces)"
        if ctx.findings.path:
            ctx.findings.save()
        return ToolResult(self.name, target=host, summary=summary, output=result.summary)

    def _retest_for(self, f):
        """Return (adapter, params, host) that re-tests exactly this finding."""
        if "Exposed path" in f.title:
            # f.target is base+path (e.g. https://h/.env); re-check the real path
            # on the correct base rather than appending the probe list to it again.
            path = f.title.split("Exposed path:", 1)[1].strip() if ":" in f.title else ""
            base = f.target[: -len(path)] if path and f.target.endswith(path) else f.target
            host = base.split("//")[-1].split("/")[0]
            return ExposedPathsProbe(), {"url": base, "extra_paths": [path] if path else []}, host
        if f.category == "tls":
            host, _, port = f.target.partition(":")
            p = {"host": host}
            if port.isdigit():
                p["port"] = int(port)
            return TlsInspect(), p, host
        if f.category == "network":
            host = f.target.split(":")[0]
            return TcpPortScan(), {"host": host}, host
        adapter = self._by_category.get(f.category, SecurityHeaders)()
        return adapter, {"url": f.target}, f.target


class WriteReport(ToolAdapter):
    name = "write_report"
    category = "remediation"
    description = "Write a full markdown assessment report (summary + all findings) to the engagement workspace."
    parameters = {"type": "object", "properties": {"title": {"type": "string"}}}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        workspace = ctx.settings.workspace_for(ctx.scope.engagement)
        out = write_report(ctx.scope, ctx.findings, workspace, params.get("title", "Security Assessment Report"))
        return ToolResult(self.name, summary=f"report written to {out}", output=f"{len(ctx.findings)} findings reported")
