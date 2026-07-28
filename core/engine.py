"""The adaptive agent loop.

This is what makes the agents "adaptive": rather than running a fixed script,
the engine gives Claude the engagement objective, the scope, the current
findings, and a set of tools, then lets the model decide what to do next based
on what it observes. Every tool call the model requests is authorized through
the Guard before it runs, so adaptivity never escapes the scope.

The Anthropic SDK is imported lazily so that scope/doctor/list-tools commands
work without it installed.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from .audit import AuditEvent
from .authorization import AuthorizationError
from .config import Settings
from .tooling import ToolContext, ToolRegistry


@dataclass
class RunResult:
    role: str
    objective: str
    iterations: int
    stopped_reason: str
    final_message: str
    tool_calls: int = 0
    denied_calls: int = 0
    transcript: list[dict] = field(default_factory=list)


class Agent:
    def __init__(
        self,
        role: str,
        system_prompt: str,
        registry: ToolRegistry,
        ctx: ToolContext,
        settings: Settings | None = None,
    ) -> None:
        self.role = role
        self.system_prompt = system_prompt
        self.registry = registry
        self.ctx = ctx
        self.settings = settings or Settings()

    # ---- public --------------------------------------------------------
    def run(self, objective: str) -> RunResult:
        if self.settings.dry_run:
            return self._dry_run(objective)
        client = self._client()
        return self._agent_loop(client, objective)

    # ---- SDK wiring ----------------------------------------------------
    def _client(self):
        try:
            from anthropic import Anthropic
        except ImportError as exc:  # pragma: no cover - env dependent
            raise RuntimeError(
                "The 'anthropic' package is not installed. Run `pip install -r requirements.txt` "
                "or `python setup/bootstrap.py`. (You can still use the `doctor`, `list-tools` and "
                "`check-scope` subcommands, or `run --dry-run`, without it.)"
            ) from exc
        if not self.settings.has_api_key():
            raise RuntimeError(
                "No ANTHROPIC_API_KEY found in the environment. Export it before running a live engagement."
            )
        return Anthropic()

    def _agent_loop(self, client, objective: str) -> RunResult:
        system = self._compose_system()
        messages = [{"role": "user", "content": self._kickoff(objective)}]
        tool_schemas = self.registry.schemas()
        tool_calls = denied = 0
        stopped = "completed"
        final_text = ""
        iteration = 0  # stays bound even if max_iterations <= 0 (empty range)

        for iteration in range(1, self.settings.max_iterations + 1):
            response = client.messages.create(
                model=self.settings.model,
                max_tokens=self.settings.max_tokens,
                system=system,
                tools=tool_schemas,
                messages=messages,
            )
            messages.append({"role": "assistant", "content": response.content})

            text_blocks = [b.text for b in response.content if getattr(b, "type", "") == "text"]
            if text_blocks:
                final_text = "\n".join(text_blocks)
                if self.settings.verbose:
                    print(f"\n[{self.role}] {final_text}\n")

            tool_uses = [b for b in response.content if getattr(b, "type", "") == "tool_use"]
            if response.stop_reason != "tool_use" or not tool_uses:
                stopped = response.stop_reason or "completed"
                break

            tool_results = []
            for block in tool_uses:
                tool_calls += 1
                allowed, text = self._dispatch(block.name, dict(block.input))
                if not allowed:
                    denied += 1
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": text, "is_error": not allowed}
                )
            messages.append({"role": "user", "content": tool_results})
        else:
            stopped = "max_iterations"

        # persist findings if a store path is configured
        if self.ctx.findings.path:
            self.ctx.findings.save()

        return RunResult(
            role=self.role,
            objective=objective,
            iterations=iteration,
            stopped_reason=stopped,
            final_message=final_text,
            tool_calls=tool_calls,
            denied_calls=denied,
        )

    # ---- tool dispatch (the authorization chokepoint) ------------------
    def _dispatch(self, name: str, params: dict) -> tuple[bool, str]:
        adapter = self.registry.get(name)
        if adapter is None:
            return False, f"error: unknown tool '{name}'"

        # Authorize EXACTLY the target the adapter will contact (its declared
        # target_param), not a precedence guess — this closes the confused-deputy
        # where the Guard validates one key while run() uses another. As defense
        # in depth, also authorize any *other* target-bearing key present, so a
        # decoy in-scope value can't smuggle an out-of-scope one past the Guard.
        tp = getattr(adapter, "target_param", None)
        primary = str(params.get(tp, "")) if tp else ""
        try:
            self.ctx.guard.check(name, primary, active=adapter.active,
                                 detail={"params": _safe(params)}, params=params)
            if tp:  # only contacting tools scope-check extra target keys
                for key in ("target", "url", "host", "repo"):
                    if key != tp and params.get(key):
                        self.ctx.guard.check(name, str(params[key]), active=adapter.active,
                                             detail={"decoy_key": key}, params=params)
        except AuthorizationError as exc:
            # Not a crash: tell the model why, so it can adapt within bounds.
            return False, f"DENIED by authorization guard: {exc}"
        target = primary

        if self.settings.verbose:
            print(f"[{self.role}] -> {name}({_safe(params)})")

        try:
            result = adapter.run(params, self.ctx)
        except Exception as exc:  # a tool blowing up should not kill the run
            self.ctx.audit.record(
                AuditEvent(kind="tool_run", action=name, target=target, allowed=True,
                           reason="exception", detail={"error": str(exc)}, actor=self.role)
            )
            return True, f"tool error: {exc}"

        for f in result.findings:
            f.discovered_by = self.role
            self.ctx.findings.add(f)
            self.ctx.audit.record(
                AuditEvent(kind="finding", action="record", target=f.target, allowed=True,
                           reason=f.title, detail={"severity": f.severity.value}, actor=self.role)
            )
        self.ctx.audit.record(
            AuditEvent(kind="tool_run", action=name, target=target, allowed=True,
                       reason=result.summary[:200], detail={"findings": len(result.findings)}, actor=self.role)
        )
        return True, result.as_model_text()

    # ---- prompt composition -------------------------------------------
    def _compose_system(self) -> str:
        s = self.ctx.scope
        rules = (
            f"ENGAGEMENT: {s.engagement}\n"
            f"AUTHORIZED BY: {s.authorized_by}\n"
            f"ACTIVE EXPLOITATION: {'ENABLED' if s.rules.active_exploitation else 'DISABLED'}\n"
            f"IN-SCOPE TARGETS: {', '.join(t.raw for t in s.targets) or '(none)'}\n"
            f"OUT OF SCOPE: {', '.join(t.raw for t in s.out_of_scope) or '(none)'}\n"
            "Every tool call is independently authorized against this scope. If a call is DENIED, "
            "do NOT try to work around it — pick a different, in-scope action. Never target anything "
            "not listed above. Never perform denial-of-service, destructive, or mass/untargeted actions."
        )
        return self.system_prompt.strip() + "\n\n=== RULES OF ENGAGEMENT (enforced) ===\n" + rules

    def _kickoff(self, objective: str) -> str:
        counts = self.ctx.findings.counts()
        known = ", ".join(f"{k}:{v}" for k, v in counts.items() if v) or "none yet"
        return (
            f"Objective: {objective}\n\n"
            f"Known findings so far: {known}\n"
            "Work iteratively: choose a tool, observe the result, and decide the next step. "
            "Record concrete findings as you go. When you have met the objective (or exhausted "
            "useful in-scope actions), stop and give a concise summary of what you found or did."
        )

    # ---- dry run -------------------------------------------------------
    def _dry_run(self, objective: str) -> RunResult:
        print(f"[dry-run] role={self.role} objective={objective!r}")
        print(f"[dry-run] scope={self.ctx.scope.engagement} targets={[t.raw for t in self.ctx.scope.targets]}")
        print("[dry-run] available tools:")
        for tname, avail, hint in self.registry.availability():
            flag = "ok " if avail else "-- "
            print(f"  {flag}{tname}" + (f"  ({hint})" if hint and not avail else ""))
        return RunResult(self.role, objective, 0, "dry_run", "dry run: no actions executed")


def _safe(params: dict) -> dict:
    """Shorten params for logging."""
    out = {}
    for k, v in params.items():
        sv = json.dumps(v) if not isinstance(v, str) else v
        out[k] = (sv[:120] + "...") if len(str(sv)) > 120 else v
    return out
