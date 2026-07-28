#!/usr/bin/env python3
"""Red-team agent entrypoint.

Usage:
  python red-team/run.py doctor
  python red-team/run.py list-tools
  python red-team/run.py check-scope --scope engagements/example/scope.yaml --target app.example.com
  python red-team/run.py run --scope engagements/example/scope.yaml --dry-run
  python red-team/run.py run --scope engagements/example/scope.yaml --objective "..." --verbose
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main("red-team"))
