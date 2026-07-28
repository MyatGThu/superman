"""Shared command-line interface for both agents.

Subcommands (work without the Anthropic SDK unless noted):
  run          run an engagement (needs the SDK + API key, unless --dry-run)
  doctor       report tool availability and environment readiness
  list-tools   list the tools available to this role
  check-scope  validate a scope file and show what is in/out of scope
  report       (re)generate the markdown report from stored findings

Both red-team/run.py and blue-team/run.py call main() with their role.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .audit import AuditLog
from .authorization import Guard
from .config import Settings
from .engine import Agent
from .findings import FindingStore
from .reporting import write_report
from .scope import Scope
from .tooling import ToolContext, ToolRegistry
from .tools import build_blue_registry, build_red_registry

ROLE_REGISTRY = {"red-team": build_red_registry, "blue-team": build_blue_registry}
DEFAULT_OBJECTIVE = {
    "red-team": "Assess the in-scope targets: enumerate exposure, identify vulnerabilities and "
                "misconfigurations, and (if active exploitation is enabled) verify the exploitable ones. "
                "Record every concrete finding with evidence.",
    "blue-team": "Triage the current findings, propose and generate concrete remediations and hardening, "
                 "verify fixes where possible, and write a report.",
}


def _prompt_path(role: str) -> Path:
    return Path(__file__).resolve().parent.parent / role / "prompts" / "system.md"


def _build(role: str, scope_path: str, settings: Settings, verbose: bool):
    scope = Scope.load(scope_path)
    workspace = settings.workspace_for(scope.engagement)
    audit = AuditLog(workspace / "audit.jsonl", echo=verbose)
    findings = FindingStore(workspace / "findings.json")
    guard = Guard(scope, audit, max_actions_per_minute=settings.max_actions_per_minute, actor=role)
    registry: ToolRegistry = ROLE_REGISTRY[role]()
    ctx = ToolContext(guard=guard, audit=audit, settings=settings, findings=findings, scope=scope)
    system_prompt = _prompt_path(role).read_text() if _prompt_path(role).exists() else f"You are the {role} agent."
    agent = Agent(role, system_prompt, registry, ctx, settings)
    return scope, agent, ctx, workspace


def main(role: str, argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog=f"{role}", description=f"Superman {role} agent")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_run = sub.add_parser("run", help="run an engagement")
    p_run.add_argument("--scope", required=True, help="path to the engagement scope YAML")
    p_run.add_argument("--objective", default=None, help="what to accomplish")
    p_run.add_argument("--model", default=None)
    p_run.add_argument("--max-iterations", type=int, default=None)
    p_run.add_argument("--dry-run", action="store_true", help="plan only; never contact targets or the API")
    p_run.add_argument("--verbose", action="store_true")

    p_doc = sub.add_parser("doctor", help="report environment/tool readiness")
    p_scope = sub.add_parser("check-scope", help="validate a scope file")
    p_scope.add_argument("--scope", required=True)
    p_scope.add_argument("--target", help="test whether a specific target is in scope")
    sub.add_parser("list-tools", help="list this role's tools")
    p_rep = sub.add_parser("report", help="regenerate the report from stored findings")
    p_rep.add_argument("--scope", required=True)

    args = parser.parse_args(argv)

    if args.cmd == "doctor":
        return _doctor(role)
    if args.cmd == "list-tools":
        return _list_tools(role)
    if args.cmd == "check-scope":
        return _check_scope(args.scope, args.target)
    if args.cmd == "report":
        return _report(role, args.scope)
    if args.cmd == "run":
        return _run(role, args)
    return 1


def _settings_from_args(args) -> Settings:
    s = Settings()
    if getattr(args, "model", None):
        s.model = args.model
    if getattr(args, "max_iterations", None):
        s.max_iterations = args.max_iterations
    if getattr(args, "dry_run", False):
        s.dry_run = True
    if getattr(args, "verbose", False):
        s.verbose = True
    return s


def _run(role: str, args) -> int:
    settings = _settings_from_args(args)
    scope, agent, ctx, workspace = _build(role, args.scope, settings, args.verbose)
    objective = args.objective or DEFAULT_OBJECTIVE[role]

    problems = scope.authorization_problems()
    if problems and not settings.dry_run:
        print("Refusing to run: the engagement scope is not authorized/ready:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print("\nFix the scope file (see engagements/example/scope.yaml) and re-run.", file=sys.stderr)
        return 2

    print(f"== {role} :: engagement '{scope.engagement}' ==")
    print(f"   targets: {', '.join(t.raw for t in scope.targets) or '(none)'}")
    print(f"   active exploitation: {'ENABLED' if scope.rules.active_exploitation else 'disabled'}")
    print(f"   workspace: {workspace}\n")

    try:
        result = agent.run(objective)
    except RuntimeError as e:
        print(f"error: {e}", file=sys.stderr)
        return 3

    print(f"\n== done: {result.stopped_reason} after {result.iterations} iteration(s); "
          f"{result.tool_calls} tool call(s), {result.denied_calls} denied ==")
    print(f"   findings: {dict((k, v) for k, v in ctx.findings.counts().items() if v)}")
    if result.final_message:
        print("\n" + result.final_message)
    if not settings.dry_run:
        report = write_report(scope, ctx.findings, workspace)
        print(f"\n   report: {report}")
        print(f"   findings json: {workspace / 'findings.json'}")
        print(f"   audit log: {workspace / 'audit.jsonl'}")
    return 0


def _doctor(role: str) -> int:
    settings = Settings()
    registry = ROLE_REGISTRY[role]()
    print(f"Superman doctor ({role})")
    print(f"  model: {settings.model}")
    print(f"  ANTHROPIC_API_KEY set: {settings.has_api_key()}")
    try:
        import anthropic  # noqa: F401
        print("  anthropic SDK: installed")
    except ImportError:
        print("  anthropic SDK: NOT installed (run: pip install -r requirements.txt)")
    print("  tools:")
    missing = 0
    for name, avail, hint in registry.availability():
        if avail:
            print(f"    ok  {name}")
        else:
            missing += 1
            print(f"    --  {name}   ({hint})")
    print(f"\n  {len(registry.names()) - missing}/{len(registry.names())} tools available. "
          f"Pure-Python tools work with no installs; run setup/install.sh for the rest.")
    return 0


def _list_tools(role: str) -> int:
    registry = ROLE_REGISTRY[role]()
    for t in registry.all():
        flag = " [ACTIVE-EXPLOIT]" if t.active else ""
        print(f"- {t.name} ({t.category}){flag}: {t.description.strip().splitlines()[0]}")
    return 0


def _check_scope(scope_path: str, target: str | None) -> int:
    scope = Scope.load(scope_path)
    print(f"engagement: {scope.engagement}")
    print(f"authorized: {scope.authorized} by {scope.authorized_by or '(unset)'}")
    problems = scope.authorization_problems()
    print("ready: " + ("YES" if not problems else "NO"))
    for p in problems:
        print(f"  - {p}")
    print("in-scope targets:")
    for t in scope.targets:
        print(f"  + {t.raw} ({t.type.value})")
    print("out-of-scope:")
    for t in scope.out_of_scope:
        print(f"  - {t.raw} ({t.type.value})")
    print(f"active exploitation: {scope.rules.active_exploitation}; max rate: {scope.rules.max_rate}/min")
    if target:
        allowed, reason = scope.is_in_scope(target)
        print(f"\ntarget test: {target} -> {'IN SCOPE' if allowed else 'OUT OF SCOPE'} ({reason})")
    return 0 if not problems else 2


def _report(role: str, scope_path: str) -> int:
    settings = Settings()
    scope = Scope.load(scope_path)
    workspace = settings.workspace_for(scope.engagement)
    findings = FindingStore(workspace / "findings.json")
    out = write_report(scope, findings, workspace)
    print(f"report written to {out} ({len(findings)} findings)")
    return 0
