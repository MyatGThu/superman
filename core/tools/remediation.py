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
        target = f.target.split(":")[0] if f.category == "network" else f.target
        # Re-authorize before re-touching the target.
        from ..authorization import AuthorizationError
        try:
            ctx.guard.check("verify_fix", target, active=False, detail={"finding": f.id})
        except AuthorizationError as e:
            return ToolResult(self.name, ok=False, target=target, summary=f"cannot verify (out of scope now): {e}")

        # Choose a re-test tool. Exposed-path findings use the path probe on the base.
        if "Exposed path" in f.title:
            adapter, key = ExposedPathsProbe(), "url"
        else:
            adapter = self._by_category.get(f.category, SecurityHeaders)()
            key = "host" if f.category in ("tls", "network") else "url"
        result = adapter.run({key: target}, ctx)
        still_present = any(nf.title == f.title for nf in result.findings)
        if still_present:
            f.notes.append("verify_fix: issue still reproduces")
            summary = f"{f.id} STILL PRESENT after re-test"
        else:
            f.status = Status.VERIFIED
            f.notes.append("verify_fix: no longer reproduces")
            summary = f"{f.id} VERIFIED fixed (no longer reproduces)"
        if ctx.findings.path:
            ctx.findings.save()
        return ToolResult(self.name, target=target, summary=summary, output=result.summary)


class WriteReport(ToolAdapter):
    name = "write_report"
    category = "remediation"
    description = "Write a full markdown assessment report (summary + all findings) to the engagement workspace."
    parameters = {"type": "object", "properties": {"title": {"type": "string"}}}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        workspace = ctx.settings.workspace_for(ctx.scope.engagement)
        out = write_report(ctx.scope, ctx.findings, workspace, params.get("title", "Security Assessment Report"))
        return ToolResult(self.name, summary=f"report written to {out}", output=f"{len(ctx.findings)} findings reported")
