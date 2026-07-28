"""The authorization Guard: the single chokepoint every target-facing action
must pass through.

The Guard combines three checks, and fails closed on any of them:

1. Engagement readiness  - scope is authorized, attested, unexpired, non-empty.
2. Scope membership      - the specific target is in-scope and not excluded.
3. Action safety         - the action is not in the always-prohibited set, and
                           active exploitation is only allowed when the scope
                           explicitly opts in.

A denied action raises AuthorizationError. Every decision (allow or deny) is
written to the audit log. There is deliberately no "force" or "bypass" flag.
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass

from .audit import AuditEvent, AuditLog
from .scope import ALWAYS_PROHIBITED, Scope


class AuthorizationError(Exception):
    """Raised when an action is not permitted by the engagement's scope/rules."""


# Keywords that, if present in an action name or description, are always denied.
# This is a coarse safety net on top of the structured checks; it catches
# destructive / mass-impact intent regardless of which tool is being driven.
PROHIBITED_KEYWORDS = (
    "ddos", "dos", "denial of service", "denial-of-service",
    "flood", "amplification", "stress-flood", "volumetric",
    "ransom", "wiper", "destroy", "wipe", "format-disk", "delete all",
    "encrypt victim", "mass scan", "internet-wide", "spray the internet",
    "botnet", "worm", "self-propagat", "supply-chain implant", "backdoor upstream",
)


@dataclass
class Decision:
    allowed: bool
    reason: str
    action: str
    target: str


class Guard:
    def __init__(self, scope: Scope, audit: AuditLog, max_actions_per_minute: int = 60, actor: str = "engine") -> None:
        self.scope = scope
        self.audit = audit
        self.actor = actor
        self.max_actions_per_minute = max(1, min(max_actions_per_minute, max(1, scope.rules.max_rate)))
        self._recent: deque[float] = deque()

    # ---- public API ----------------------------------------------------
    def check(self, action: str, target: str = "", *, active: bool = False, detail: dict | None = None) -> Decision:
        """Authorize an action. Returns a Decision on success; raises on denial."""
        decision = self._evaluate(action, target, active=active)
        self.audit.record(
            AuditEvent(
                kind="authorization",
                action=action,
                target=target,
                allowed=decision.allowed,
                reason=decision.reason,
                detail={**(detail or {}), "active": active},
                actor=self.actor,
            )
        )
        if not decision.allowed:
            raise AuthorizationError(decision.reason)
        self._register_rate()
        return decision

    def is_allowed(self, action: str, target: str = "", *, active: bool = False) -> bool:
        try:
            return self._evaluate(action, target, active=active).allowed
        except Exception:
            return False

    # ---- internals -----------------------------------------------------
    def _evaluate(self, action: str, target: str, *, active: bool) -> Decision:
        norm = (action or "").strip().lower()

        # 1. Engagement readiness.
        problems = self.scope.authorization_problems()
        if problems:
            return Decision(False, "engagement not authorized: " + "; ".join(problems), action, target)

        # 2. Always-prohibited actions (destructive / mass-impact).
        for kw in PROHIBITED_KEYWORDS + ALWAYS_PROHIBITED:
            if kw in norm:
                return Decision(False, f"action '{action}' is always prohibited (matched '{kw}')", action, target)
        for kw in self.scope.rules.prohibited:
            if kw.strip().lower() in norm:
                return Decision(False, f"action '{action}' is prohibited by this engagement's rules ('{kw}')", action, target)

        # 3. Active exploitation must be explicitly enabled by the scope.
        if active and not self.scope.rules.active_exploitation:
            return Decision(
                False,
                f"action '{action}' is active exploitation, which this engagement has not enabled "
                "(set rules.active_exploitation: true in the scope to allow it)",
                action,
                target,
            )

        # 4. Scope membership (only when a target is named).
        if target:
            in_scope, reason = self.scope.is_in_scope(target)
            if not in_scope:
                return Decision(False, f"out of scope: {reason}", action, target)

        # 5. Rate limit.
        if self._rate_exceeded():
            return Decision(
                False,
                f"rate limit exceeded ({self.max_actions_per_minute} actions/min); back off and retry",
                action,
                target,
            )

        return Decision(True, f"authorized: {action}" + (f" -> {target}" if target else ""), action, target)

    def _register_rate(self) -> None:
        self._recent.append(_now())

    def _rate_exceeded(self) -> bool:
        cutoff = _now() - 60.0
        while self._recent and self._recent[0] < cutoff:
            self._recent.popleft()
        return len(self._recent) >= self.max_actions_per_minute


def _now() -> float:
    return time.monotonic()
