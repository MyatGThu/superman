#!/usr/bin/env python3
"""Blue-team agent entrypoint.

Usage:
  python blue-team/run.py doctor
  python blue-team/run.py list-tools
  python blue-team/run.py check-scope --scope engagements/example/scope.yaml
  python blue-team/run.py run --scope engagements/example/scope.yaml --dry-run
  python blue-team/run.py run --scope engagements/example/scope.yaml --objective "..." --verbose
  python blue-team/run.py report --scope engagements/example/scope.yaml
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main("blue-team"))
