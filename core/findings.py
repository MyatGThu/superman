"""The finding / vulnerability data model shared by both teams.

A Finding is the unit of currency between red and blue: the red team produces
them, the blue team consumes them (triage -> remediate -> verify). Findings are
stored as JSON so an engagement is fully reproducible and diffable.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Iterable


class Severity(str, Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @property
    def rank(self) -> int:
        return {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}[self.value]

    @classmethod
    def from_cvss(cls, score: float) -> "Severity":
        if score >= 9.0:
            return cls.CRITICAL
        if score >= 7.0:
            return cls.HIGH
        if score >= 4.0:
            return cls.MEDIUM
        if score > 0.0:
            return cls.LOW
        return cls.INFO


class Status(str, Enum):
    OPEN = "open"          # discovered, not yet acted on
    TRIAGED = "triaged"    # blue team assessed / prioritized
    REMEDIATED = "remediated"  # a fix was applied
    VERIFIED = "verified"  # blue team confirmed the fix closed it (re-test passed)
    ACCEPTED = "accepted"  # risk knowingly accepted
    FALSE_POSITIVE = "false_positive"


@dataclass
class Finding:
    title: str
    severity: Severity
    target: str
    category: str = "misc"          # e.g. "web", "network", "tls", "secrets", "auth", "config"
    description: str = ""
    evidence: str = ""              # what was observed (request/response snippet, banner, etc.)
    remediation: str = ""           # how to fix it (blue team fills/expands this)
    cve: str = ""                   # e.g. "CVE-2021-44228"
    cvss: float | None = None
    references: list[str] = field(default_factory=list)
    discovered_by: str = "red-team"
    status: Status = Status.OPEN
    notes: list[str] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def __post_init__(self) -> None:
        if isinstance(self.severity, str):
            self.severity = Severity(self.severity)
        if isinstance(self.status, str):
            self.status = Status(self.status)
        if self.cvss is not None and self.severity == Severity.INFO:
            # If a CVSS was supplied but severity left default, derive it.
            self.severity = Severity.from_cvss(self.cvss)

    @property
    def id(self) -> str:
        """Stable id derived from the identifying fields, for dedup."""
        h = hashlib.sha1(f"{self.target}|{self.category}|{self.title}".encode()).hexdigest()
        return h[:12]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["severity"] = self.severity.value
        d["status"] = self.status.value
        d["id"] = self.id
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Finding":
        d = {k: v for k, v in d.items() if k != "id"}
        return cls(**d)


class FindingStore:
    """Deduplicating, persistable collection of findings for one engagement."""

    def __init__(self, path: Path | None = None) -> None:
        self._by_id: dict[str, Finding] = {}
        self.path = Path(path) if path else None
        if self.path and self.path.exists():
            self.load()

    def add(self, finding: Finding) -> Finding:
        existing = self._by_id.get(finding.id)
        if existing:
            # Keep the higher severity and merge notes/evidence.
            if finding.severity.rank > existing.severity.rank:
                existing.severity = finding.severity
            for note in finding.notes:
                if note not in existing.notes:
                    existing.notes.append(note)
            if finding.evidence and finding.evidence not in existing.evidence:
                existing.evidence = (existing.evidence + "\n" + finding.evidence).strip()
            return existing
        self._by_id[finding.id] = finding
        return finding

    def extend(self, findings: Iterable[Finding]) -> None:
        for f in findings:
            self.add(f)

    def get(self, finding_id: str) -> Finding | None:
        return self._by_id.get(finding_id)

    def all(self) -> list[Finding]:
        return sorted(self._by_id.values(), key=lambda f: (-f.severity.rank, f.target, f.title))

    def by_severity(self, minimum: Severity = Severity.INFO) -> list[Finding]:
        return [f for f in self.all() if f.severity.rank >= minimum.rank]

    def open(self) -> list[Finding]:
        return [f for f in self.all() if f.status in (Status.OPEN, Status.TRIAGED)]

    def counts(self) -> dict[str, int]:
        out = {s.value: 0 for s in Severity}
        for f in self._by_id.values():
            out[f.severity.value] += 1
        return out

    def save(self, path: Path | None = None) -> Path:
        target = Path(path) if path else self.path
        if not target:
            raise ValueError("no path configured for FindingStore.save()")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps([f.to_dict() for f in self.all()], indent=2))
        self.path = target
        return target

    def load(self, path: Path | None = None) -> None:
        target = Path(path) if path else self.path
        if not target or not target.exists():
            return
        for d in json.loads(target.read_text() or "[]"):
            self.add(Finding.from_dict(d))

    def __len__(self) -> int:
        return len(self._by_id)
