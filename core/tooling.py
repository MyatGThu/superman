"""Tool adapter framework.

A ToolAdapter wraps one capability (a recon technique, a scanner, an
exploitation tool, a remediation action) behind a uniform interface so the
adaptive engine can drive any of them. Two rules make this safe:

- The engine authorizes every call through the Guard *before* the adapter's
  `run()` executes. An adapter that discovers *new* targets (e.g. subdomain
  enumeration) must re-authorize each one before touching it, using the Guard
  passed in the ToolContext.
- An adapter declares `active = True` if it performs active exploitation. The
  Guard only permits those when the engagement's scope opts in.

Adapters degrade gracefully: if their required binary is missing, `available()`
is False and `run()` returns a ToolResult explaining how to install it (many
adapters also ship a pure-Python fallback so they work with no external tools).
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from .findings import Finding

if TYPE_CHECKING:  # avoid import cycles at runtime
    from .audit import AuditLog
    from .authorization import Guard
    from .config import Settings
    from .findings import FindingStore
    from .scope import Scope


@dataclass
class ToolContext:
    """Everything an adapter needs from the engagement, passed to run()."""

    guard: "Guard"
    audit: "AuditLog"
    settings: "Settings"
    findings: "FindingStore"
    scope: "Scope"


@dataclass
class ToolResult:
    tool: str
    ok: bool = True
    target: str = ""
    summary: str = ""
    output: str = ""                     # human/agent readable text (fed back to the model)
    findings: list[Finding] = field(default_factory=list)
    available: bool = True
    remediation_hint: str = ""           # how to install the tool if unavailable

    def as_model_text(self, max_len: int = 6000) -> str:
        parts = [self.summary.strip()] if self.summary else []
        if not self.available:
            parts.append(f"[tool unavailable] {self.remediation_hint}")
        if self.findings:
            parts.append("Findings:")
            for f in self.findings:
                parts.append(f"  - [{f.severity.value.upper()}] {f.title} ({f.target})")
        if self.output:
            parts.append("Output:\n" + self.output)
        text = "\n".join(p for p in parts if p).strip() or "(no output)"
        return text[:max_len] + ("\n...[truncated]" if len(text) > max_len else "")


@dataclass
class SafeRun:
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool = False
    not_found: bool = False

    @property
    def ok(self) -> bool:
        return self.returncode == 0 and not self.timed_out and not self.not_found


def safe_run(cmd: list[str], timeout: int = 300, input_data: str | None = None) -> SafeRun:
    """Run a subprocess with no shell, a hard timeout, and captured output.

    Never uses shell=True (no shell-injection surface). Missing binaries and
    timeouts are returned as structured results rather than raised.
    """
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            input=input_data,
            check=False,
        )
        return SafeRun(proc.returncode, proc.stdout or "", proc.stderr or "")
    except FileNotFoundError:
        return SafeRun(127, "", f"binary not found: {cmd[0]}", not_found=True)
    except subprocess.TimeoutExpired as exc:
        out = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        return SafeRun(124, out, f"timed out after {timeout}s", timed_out=True)


class ToolAdapter:
    """Base class for all tools. Subclasses set the class attributes and
    implement `run`."""

    name: str = "tool"
    description: str = ""
    category: str = "misc"
    requires: tuple[str, ...] = ()      # external binaries needed; empty => pure python
    active: bool = False                # True => active exploitation (scope-gated)
    # The single parameter key naming the target this adapter actually contacts.
    # The engine authorizes exactly this value (not a precedence guess), so the
    # Guard validates the same string run() acts on. None => this tool contacts
    # no target (meta tools; tools that re-authorize internally).
    target_param: str | None = None
    parameters: dict = {"type": "object", "properties": {}, "required": []}

    def available(self) -> bool:
        return all(shutil.which(b) is not None for b in self.requires)

    def missing_binaries(self) -> list[str]:
        return [b for b in self.requires if shutil.which(b) is None]

    def install_hint(self) -> str:
        if not self.requires:
            return ""
        return f"install: {', '.join(self.missing_binaries())} (see setup/install.sh)"

    def schema(self) -> dict:
        return {"name": self.name, "description": self.description.strip(), "input_schema": self.parameters}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:  # pragma: no cover - abstract
        raise NotImplementedError

    # convenience for subclasses
    def _unavailable(self, target: str = "") -> ToolResult:
        return ToolResult(
            tool=self.name,
            ok=False,
            target=target,
            available=False,
            summary=f"{self.name} is not available in this environment.",
            remediation_hint=self.install_hint(),
        )


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolAdapter] = {}

    def register(self, adapter: ToolAdapter) -> "ToolRegistry":
        self._tools[adapter.name] = adapter
        return self

    def register_all(self, adapters) -> "ToolRegistry":
        for a in adapters:
            self.register(a)
        return self

    def get(self, name: str) -> ToolAdapter | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    def all(self) -> list[ToolAdapter]:
        return [self._tools[n] for n in self.names()]

    def schemas(self) -> list[dict]:
        return [t.schema() for t in self.all()]

    def availability(self) -> list[tuple[str, bool, str]]:
        return [(t.name, t.available(), t.install_hint()) for t in self.all()]
