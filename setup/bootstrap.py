#!/usr/bin/env python3
"""Bootstrap helper: check readiness and scaffold a new engagement.

  python setup/bootstrap.py                       # check environment readiness
  python setup/bootstrap.py --new-engagement acme # create engagements/acme/scope.yaml
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def check() -> int:
    print("Superman bootstrap — environment check\n")
    ok = True
    # Python deps
    try:
        import yaml  # noqa: F401
        print("  [ok] PyYAML")
    except ImportError:
        ok = False
        print("  [--] PyYAML missing — run: pip install -r requirements.txt")
    try:
        import anthropic  # noqa: F401
        print("  [ok] anthropic SDK")
    except ImportError:
        print("  [--] anthropic SDK missing (needed only for live runs) — pip install -r requirements.txt")

    from core.config import Settings
    s = Settings()
    print(f"  [{'ok' if s.has_api_key() else '--'}] ANTHROPIC_API_KEY {'set' if s.has_api_key() else 'not set (needed for live runs)'}")

    from core.tools import build_red_registry
    avail = build_red_registry().availability()
    have = sum(1 for _, a, _ in avail if a)
    print(f"\n  Tools available: {have}/{len(avail)} (pure-Python tools always work; run setup/install.sh for the rest)")
    print("\n  Next: copy engagements/example/scope.yaml, fill in authorization, then:")
    print("    python red-team/run.py check-scope --scope engagements/<name>/scope.yaml")
    return 0 if ok else 1


def new_engagement(name: str) -> int:
    dest_dir = ROOT / "engagements" / name
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / "scope.yaml"
    if dest.exists():
        print(f"refusing to overwrite existing {dest}")
        return 1
    shutil.copy(ROOT / "engagements" / "example" / "scope.yaml", dest)
    print(f"created {dest}")
    print("Edit it: set engagement name, targets, and the authorization block (authorized: true + attestation).")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--new-engagement", metavar="NAME", help="scaffold a new engagement scope from the template")
    args = ap.parse_args()
    if args.new_engagement:
        return new_engagement(args.new_engagement)
    return check()


if __name__ == "__main__":
    raise SystemExit(main())
