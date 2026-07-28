"""Render an engagement's findings and audit trail into reports."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from .findings import FindingStore, Severity
from .scope import Scope

_SEV_ORDER = [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO]


def markdown_report(scope: Scope, store: FindingStore, title: str = "Security Assessment Report") -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    counts = store.counts()
    lines = [
        f"# {title}",
        "",
        f"**Engagement:** {scope.engagement}  ",
        f"**Authorized by:** {scope.authorized_by or '(unspecified)'}  ",
        f"**Generated:** {now}  ",
        f"**Scope:** {', '.join(t.raw for t in scope.targets) or '(none)'}",
        "",
        "## Summary",
        "",
        "| Severity | Count |",
        "| --- | --- |",
    ]
    for sev in _SEV_ORDER:
        lines.append(f"| {sev.value.title()} | {counts.get(sev.value, 0)} |")
    lines += ["", f"**Total findings:** {len(store)}", ""]

    lines.append("## Findings")
    lines.append("")
    if not len(store):
        lines.append("_No findings recorded._")
    for sev in _SEV_ORDER:
        group = [f for f in store.all() if f.severity == sev]
        if not group:
            continue
        lines.append(f"### {sev.value.title()} ({len(group)})")
        lines.append("")
        for f in group:
            lines.append(f"#### {f.title}")
            lines.append("")
            lines.append(f"- **ID:** `{f.id}`  ")
            lines.append(f"- **Target:** {f.target}  ")
            lines.append(f"- **Category:** {f.category}  ")
            lines.append(f"- **Status:** {f.status.value}  ")
            if f.cve:
                lines.append(f"- **CVE:** {f.cve}  ")
            if f.cvss is not None:
                lines.append(f"- **CVSS:** {f.cvss}  ")
            lines.append(f"- **Discovered by:** {f.discovered_by}  ")
            if f.description:
                lines.append(f"\n{f.description}\n")
            if f.evidence:
                lines.append("**Evidence:**\n")
                lines.append("```\n" + f.evidence.strip()[:1200] + "\n```")
            if f.remediation:
                lines.append(f"\n**Remediation:** {f.remediation}")
            if f.references:
                lines.append("\n**References:** " + ", ".join(f.references))
            if f.notes:
                lines.append("\n**Notes:** " + "; ".join(f.notes))
            lines.append("")
    return "\n".join(lines)


def write_report(scope: Scope, store: FindingStore, workspace: Path, title: str = "Security Assessment Report") -> Path:
    md = markdown_report(scope, store, title)
    out = Path(workspace) / "report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md)
    return out
