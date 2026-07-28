"""Runtime configuration for the Superman engine.

Settings come from (in order of precedence): explicit constructor args,
environment variables, then built-in defaults. Nothing here is secret; the
Anthropic API key is read by the SDK itself from ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# Default model. Override with SUPERMAN_MODEL. These are the public Claude
# model line; pick opus for depth, sonnet for speed/cost, haiku for cheap loops.
DEFAULT_MODEL = "claude-sonnet-5"
KNOWN_MODELS = ("claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001")


@dataclass
class Settings:
    """Global engine settings, independent of any single engagement."""

    model: str = field(default_factory=lambda: os.environ.get("SUPERMAN_MODEL", DEFAULT_MODEL))
    max_iterations: int = field(default_factory=lambda: int(os.environ.get("SUPERMAN_MAX_ITERATIONS", "40")))
    max_tokens: int = field(default_factory=lambda: int(os.environ.get("SUPERMAN_MAX_TOKENS", "4096")))
    # Default per-tool wall-clock timeout in seconds.
    tool_timeout: int = field(default_factory=lambda: int(os.environ.get("SUPERMAN_TOOL_TIMEOUT", "300")))
    # Politeness / safety rate limit: max tool invocations per minute against targets.
    max_actions_per_minute: int = field(
        default_factory=lambda: int(os.environ.get("SUPERMAN_MAX_ACTIONS_PER_MINUTE", "60"))
    )
    # Where engagement workspaces (logs, findings, reports) are written.
    workspace_root: Path = field(
        default_factory=lambda: Path(os.environ.get("SUPERMAN_WORKSPACE", "engagements")).resolve()
    )
    # If True, the engine plans and prints tool calls but never executes them.
    dry_run: bool = field(default_factory=lambda: os.environ.get("SUPERMAN_DRY_RUN", "").lower() in ("1", "true", "yes"))
    verbose: bool = field(default_factory=lambda: os.environ.get("SUPERMAN_VERBOSE", "").lower() in ("1", "true", "yes"))

    def __post_init__(self) -> None:
        # Clamp to sane minimums so misconfiguration degrades gracefully rather
        # than producing empty ranges / nonsensical loops.
        self.max_iterations = max(1, int(self.max_iterations))
        self.max_tokens = max(256, int(self.max_tokens))
        self.tool_timeout = max(1, int(self.tool_timeout))
        self.max_actions_per_minute = max(1, int(self.max_actions_per_minute))

    def workspace_for(self, engagement: str) -> Path:
        safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in engagement) or "engagement"
        path = self.workspace_root / safe
        path.mkdir(parents=True, exist_ok=True)
        return path

    def has_api_key(self) -> bool:
        return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
