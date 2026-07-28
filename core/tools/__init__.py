"""Concrete tool adapters and registry builders.

`build_red_registry()` and `build_blue_registry()` assemble the set of tools
each agent is given. Red gets offensive tooling (recon, scanning, and — when
the scope enables it — active exploitation). Blue gets the read-only assessment
tools plus remediation/hardening/verification tools. Both share the meta-tools
(record_finding, list_findings, note).
"""

from __future__ import annotations

from ..tooling import ToolRegistry
from .common import ListFindings, Note, RecordFinding
from .exploit import KnownCveExploit, SqlmapExploit, WebExploitTemplates
from .network_recon import NmapScan, TcpPortScan
from .remediation import (
    GenerateHardening,
    ProposeRemediation,
    UpdateFindingStatus,
    VerifyFix,
    WriteReport,
)
from .repo_scan import DependencyAudit, GitleaksScan, SecretRegexScan, SemgrepScan
from .web_recon import HttpFingerprint, SecurityHeaders, TlsInspect
from .web_vuln import ExposedPathsProbe, NikitoScan, NucleiScan

META_TOOLS = [RecordFinding(), ListFindings(), Note()]

RED_RECON = [SecurityHeaders(), TlsInspect(), HttpFingerprint(), TcpPortScan(), NmapScan()]
RED_SCAN = [ExposedPathsProbe(), NucleiScan(), NikitoScan(), SecretRegexScan(), GitleaksScan(),
            DependencyAudit(), SemgrepScan()]
RED_EXPLOIT = [WebExploitTemplates(), SqlmapExploit(), KnownCveExploit()]

BLUE_TOOLS = [SecurityHeaders(), TlsInspect(), HttpFingerprint(), TcpPortScan(),
              SecretRegexScan(), DependencyAudit(), SemgrepScan(),
              ProposeRemediation(), GenerateHardening(), VerifyFix(),
              UpdateFindingStatus(), WriteReport()]


def build_red_registry() -> ToolRegistry:
    reg = ToolRegistry()
    reg.register_all(META_TOOLS)
    reg.register_all(RED_RECON)
    reg.register_all(RED_SCAN)
    reg.register_all(RED_EXPLOIT)
    return reg


def build_blue_registry() -> ToolRegistry:
    reg = ToolRegistry()
    reg.register_all(META_TOOLS)
    reg.register_all(BLUE_TOOLS)
    return reg
