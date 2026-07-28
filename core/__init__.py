"""Superman: an adaptive Red Team / Blue Team security automation framework.

The `core` package is the shared engine used by both the red-team and
blue-team agents. It provides:

- `scope`        : engagement scope + authorization model (who/what is in bounds)
- `authorization`: the enforcement gate every action must pass through
- `audit`        : append-only audit log of every guarded action and tool run
- `findings`     : the vulnerability / finding data model and storage
- `tooling`      : the ToolAdapter base class, registry, and safe subprocess exec
- `engine`       : the adaptive Claude-driven agent loop
- `reporting`    : human- and machine-readable reports
- `tools/*`      : concrete tool adapters (recon, web, exploit, repo, remediation)

Nothing in this package performs any network action against a target until it
has been checked against an authorized, in-scope engagement. See
`authorization.Guard` and the top-level RULES_OF_ENGAGEMENT.md.
"""

__version__ = "0.1.0"
