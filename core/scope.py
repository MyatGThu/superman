"""Engagement scope + authorization model.

A Scope is the single source of truth for *what an engagement is allowed to
touch*. It is loaded from a YAML file (see engagements/example/scope.yaml) and
consulted by the authorization Guard before every action. No target is ever
touched unless it matches an in-scope entry and is not excluded.

Design intent: fail closed. Anything ambiguous, unparseable, expired, or
unattested resolves to "not authorized".
"""

from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from urllib.parse import urlparse

import yaml


class TargetType(str, Enum):
    HOST = "host"       # a hostname or single IP, e.g. app.example.com / 10.0.0.5
    DOMAIN = "domain"   # a domain + all subdomains, e.g. *.example.com
    CIDR = "cidr"       # an IP range, e.g. 10.0.0.0/24
    URL = "url"         # a specific URL / web app root
    REPO = "repo"       # a source repository (path or git URL)


def classify(raw: str) -> TargetType:
    """Best-effort classification of a target string."""
    s = raw.strip()
    if s.startswith(("http://", "https://")):
        return TargetType.URL
    if s.startswith("*.") or s.startswith("."):
        return TargetType.DOMAIN
    if re.match(r"^(git@|ssh://|https?://).*\.git$", s) or s.startswith("git@") or s.endswith(".git"):
        return TargetType.REPO
    try:
        ipaddress.ip_network(s, strict=False)
        return TargetType.CIDR if "/" in s else TargetType.HOST
    except ValueError:
        pass
    if "/" in s and not s.count(".") and Path(s).exists():
        return TargetType.REPO
    # A local filesystem path to a repo.
    if s.startswith(("/", "./", "../")) or Path(s).exists():
        return TargetType.REPO
    return TargetType.HOST


def _host_of(raw: str) -> str:
    """Extract the hostname/IP from a URL or bare host."""
    s = raw.strip()
    if s.startswith(("http://", "https://")):
        return (urlparse(s).hostname or "").lower()
    # strip a trailing path if present on a bare host
    return s.split("/")[0].split(":")[0].lower()


@dataclass
class Target:
    raw: str
    type: TargetType | None = None  # None => auto-classify from `raw`

    def __post_init__(self) -> None:
        if self.type is None:
            self.type = classify(self.raw)
        elif isinstance(self.type, str):
            self.type = TargetType(self.type)

    def matches(self, candidate: str) -> bool:
        """Does `candidate` (a host, ip, url, or repo) fall within this target?"""
        cand = candidate.strip()
        if self.type == TargetType.URL:
            return _host_of(cand) == _host_of(self.raw) or cand.rstrip("/") == self.raw.rstrip("/")
        if self.type == TargetType.REPO:
            return cand.rstrip("/") == self.raw.rstrip("/") or _repo_key(cand) == _repo_key(self.raw)
        if self.type == TargetType.DOMAIN:
            base = self.raw.lstrip("*.").lstrip(".").lower()
            host = _host_of(cand)
            return host == base or host.endswith("." + base)
        if self.type == TargetType.CIDR:
            try:
                net = ipaddress.ip_network(self.raw, strict=False)
                return ipaddress.ip_address(_host_of(cand)) in net
            except ValueError:
                return False
        # HOST
        return _host_of(cand) == _host_of(self.raw)


def _repo_key(raw: str) -> str:
    """Normalize a repo reference (git url or path) to a comparable key."""
    s = raw.strip().rstrip("/")
    s = re.sub(r"\.git$", "", s)
    s = re.sub(r"^git@([^:]+):", r"\1/", s)
    s = re.sub(r"^https?://", "", s)
    s = re.sub(r"^ssh://", "", s)
    return s.lower()


@dataclass
class Rules:
    """Per-engagement rules of engagement, enforced by the Guard."""

    active_exploitation: bool = False   # may the red team attempt real exploits?
    max_rate: int = 60                  # max target-facing actions per minute
    allow_credential_testing: bool = False  # default-cred / password spray (throttled)
    # Actions that are ALWAYS forbidden regardless of anything else.
    prohibited: list[str] = field(default_factory=list)


# Categories of action that are never permitted, in any mode. These are matched
# as substrings against a normalized action name; the Guard also has a broader
# keyword blocklist (see authorization.PROHIBITED_KEYWORDS).
ALWAYS_PROHIBITED = (
    "dos", "ddos", "denial-of-service", "denial_of_service", "flood", "amplification",
    "ransomware", "wiper", "destroy", "wipe", "encrypt-data", "delete-data",
    "exfiltrate-pii", "mass-scan", "spray-internet",
)


@dataclass
class Scope:
    engagement: str
    operator: str = ""
    authorized: bool = False
    authorized_by: str = ""
    attestation: str = ""
    expires: date | None = None
    targets: list[Target] = field(default_factory=list)
    out_of_scope: list[Target] = field(default_factory=list)
    rules: Rules = field(default_factory=Rules)
    contact: str = ""
    notes: str = ""
    source_path: Path | None = None

    # ---- loading -------------------------------------------------------
    @classmethod
    def load(cls, path: str | Path) -> "Scope":
        p = Path(path)
        data = yaml.safe_load(p.read_text()) or {}
        return cls.from_dict(data, source_path=p)

    @classmethod
    def from_dict(cls, data: dict, source_path: Path | None = None) -> "Scope":
        auth = data.get("authorization", {}) or {}
        rules_raw = data.get("rules", {}) or {}
        expires = auth.get("expires")
        if isinstance(expires, str):
            try:
                expires = datetime.fromisoformat(expires).date()
            except ValueError:
                expires = None
        elif isinstance(expires, datetime):
            expires = expires.date()

        def _targets(items) -> list[Target]:
            out = []
            for item in items or []:
                if isinstance(item, dict):
                    out.append(Target(raw=item["target"], type=item.get("type")))
                else:
                    out.append(Target(raw=str(item)))
            return out

        return cls(
            engagement=data.get("engagement", "unnamed"),
            operator=data.get("operator", ""),
            authorized=bool(auth.get("authorized", False)),
            authorized_by=auth.get("authorized_by", ""),
            attestation=auth.get("attestation", ""),
            expires=expires,
            targets=_targets(data.get("targets")),
            out_of_scope=_targets(data.get("out_of_scope")),
            rules=Rules(
                active_exploitation=bool(rules_raw.get("active_exploitation", False)),
                max_rate=int(rules_raw.get("max_rate", 60)),
                allow_credential_testing=bool(rules_raw.get("allow_credential_testing", False)),
                prohibited=list(rules_raw.get("prohibited", [])),
            ),
            contact=data.get("contact", ""),
            notes=data.get("notes", ""),
            source_path=source_path,
        )

    # ---- authorization checks -----------------------------------------
    def authorization_problems(self) -> list[str]:
        """Return a list of reasons this scope is NOT ready to run. Empty == good."""
        problems: list[str] = []
        if not self.authorized:
            problems.append("authorization.authorized is not true")
        if not self.authorized_by.strip():
            problems.append("authorization.authorized_by is empty (who signed off?)")
        if not self.attestation.strip():
            problems.append("authorization.attestation is empty (ownership/permission statement required)")
        if not self.targets:
            problems.append("no in-scope targets defined")
        if self.expires is not None and self.expires < _today():
            problems.append(f"authorization expired on {self.expires.isoformat()}")
        return problems

    def is_ready(self) -> bool:
        return not self.authorization_problems()

    def is_in_scope(self, candidate: str) -> tuple[bool, str]:
        """Return (allowed, reason). Fails closed."""
        for ex in self.out_of_scope:
            if ex.matches(candidate):
                return False, f"'{candidate}' matches an explicit out-of-scope entry ({ex.raw})"
        for t in self.targets:
            if t.matches(candidate):
                return True, f"'{candidate}' is in scope via {t.raw} ({t.type.value})"
        return False, f"'{candidate}' does not match any in-scope target"


def _today() -> date:
    return datetime.now().date()
