"""Append-only audit log.

Every authorization decision and every tool invocation is recorded here as a
JSON line. The log is the accountability record for an engagement: it answers
"what did this agent do, against what, and was it authorized?" It is written to
the engagement workspace and should be retained.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class AuditEvent:
    kind: str                      # "authorization" | "tool_run" | "finding" | "note"
    action: str
    target: str = ""
    allowed: bool | None = None
    reason: str = ""
    detail: dict[str, Any] = field(default_factory=dict)
    actor: str = "engine"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "kind": self.kind,
            "actor": self.actor,
            "action": self.action,
            "target": self.target,
            "allowed": self.allowed,
            "reason": self.reason,
            "detail": self.detail,
        }


class AuditLog:
    def __init__(self, path: Path | None = None, echo: bool = False) -> None:
        self.path = Path(path) if path else None
        self.echo = echo
        self.events: list[AuditEvent] = []
        if self.path:
            self.path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, event: AuditEvent) -> AuditEvent:
        self.events.append(event)
        line = json.dumps(event.to_dict())
        if self.path:
            with self.path.open("a") as fh:
                fh.write(line + "\n")
        if self.echo:
            flag = "" if event.allowed is None else ("ALLOW " if event.allowed else "DENY  ")
            print(f"[audit] {flag}{event.kind}:{event.action} {event.target} {event.reason}".rstrip())
        return event

    def note(self, action: str, detail: dict | None = None, actor: str = "engine") -> None:
        self.record(AuditEvent(kind="note", action=action, detail=detail or {}, actor=actor))
