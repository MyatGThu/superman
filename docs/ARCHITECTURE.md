# Architecture & Extension Guide

## Modules

| Module | Responsibility |
| --- | --- |
| `core/config.py` | `Settings` — model, iteration/token caps, timeouts, rate limit, workspace, dry-run. |
| `core/scope.py` | `Scope`, `Target`, `Rules` — the authorization model; target classification and in/out-of-scope matching. Fails closed. |
| `core/authorization.py` | `Guard` — the single chokepoint. Checks readiness, prohibited actions, active-exploit gating, scope membership, rate limit. Raises `AuthorizationError`; logs every decision. |
| `core/audit.py` | `AuditLog` — append-only JSONL of every decision, tool run, and finding. |
| `core/findings.py` | `Finding`, `Severity`, `Status`, `FindingStore` — the data exchanged between red and blue; JSON-persisted and deduplicating. |
| `core/tooling.py` | `ToolAdapter` base, `ToolRegistry`, `ToolContext`, `ToolResult`, `safe_run` (no-shell subprocess with timeout). |
| `core/engine.py` | `Agent` — the adaptive Claude tool-use loop. Every tool call is guarded in `_dispatch` before it runs. |
| `core/reporting.py` | Markdown report rendering. |
| `core/tools/*` | Concrete adapters + hardening template library. |
| `core/cli.py` | Shared CLI (`run`, `doctor`, `list-tools`, `check-scope`, `report`) used by both `run.py` entrypoints. |

## The safety invariant

> No `ToolAdapter.run()` that contacts a target executes unless `Guard.check()`
> authorized that exact `(action, target, active)` first.

The engine enforces this in `Agent._dispatch`. Adapters that discover **new**
targets mid-run (e.g. subdomain enumeration) must re-authorize each discovered
target through `ctx.guard` before touching it — `verify_fix` is the reference
example. A denied call is returned to the model as feedback, never a crash, so
the agent adapts within bounds.

## Add a tool

1. Subclass `ToolAdapter` in a file under `core/tools/`:

```python
from ..tooling import ToolAdapter, ToolContext, ToolResult, safe_run
from ..findings import Finding, Severity

class MyScan(ToolAdapter):
    name = "my_scan"                 # unique; becomes the Claude tool name
    category = "web"
    description = "One-line, model-facing description of what it does."
    requires = ("mytool",)           # external binaries; empty => pure-Python
    active = False                   # True => active exploitation (scope-gated)
    parameters = {"type": "object", "properties": {"url": {"type": "string"}}, "required": ["url"]}

    def run(self, params, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("url", ""))
        res = safe_run(["mytool", params["url"]], timeout=ctx.settings.tool_timeout)
        findings = [Finding("...", Severity.MEDIUM, params["url"], "web", evidence=res.stdout)]
        return ToolResult(self.name, target=params["url"], summary="...", output=res.stdout, findings=findings)
```

2. Register it in `core/tools/__init__.py` (add to `RED_*` / `BLUE_TOOLS`).
3. Prefer a **pure-Python fallback** so the tool is useful without installs. Set
   `active = True` for anything that exploits/changes target state.
4. Add a test under `tests/` (see `tests/test_tools_integration.py` for the
   local-server pattern).

## Add a hardening template

Add an entry to `HARDENING_TEMPLATES` in `core/tools/hardening.py` (a `body`
string with optional `{placeholder}`s and a `filename`). It's immediately
available to `generate_hardening`.

## Runtimes

- **Standalone:** `red-team/run.py` / `blue-team/run.py` → `core/cli.py` → `Agent`.
- **Claude Code subagents:** `.claude/agents/red-team.md` / `blue-team.md` drive
  the same `run.py` scripts, so both runtimes share one engine and one scope.

## Testing

```bash
python -m pytest -q
```

The suite covers scope matching, the authorization Guard (allow/deny paths,
prohibited keywords, active-exploit gating, rate limiting, audit), the finding
model, and guarded tool dispatch against a local throwaway server — all without
the SDK or any network egress.
