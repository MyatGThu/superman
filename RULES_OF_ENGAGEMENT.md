# Rules of Engagement

These agents perform **real** security testing. Read this before running them.

## 1. Authorization is mandatory

Only test systems you **own** or have **explicit, written permission** to test. Unauthorized access to computer systems is illegal in most jurisdictions (e.g. the US Computer Fraud and Abuse Act, the UK Computer Misuse Act, and equivalents elsewhere) regardless of intent.

Every engagement is defined by a scope file (`engagements/<name>/scope.yaml`). Setting `authorization.authorized: true` and filling in `authorized_by` and `attestation` **is your attestation** that you hold that right for every listed target. The framework refuses to act until those are set and unexpired.

## 2. What the framework enforces automatically

The authorization `Guard` (`core/authorization.py`) checks **every** action and fails closed:

- The engagement must be authorized, attested, and not past its expiry date.
- The specific target must match an in-scope entry and must not match an out-of-scope carve-out.
- The action must not be in the always-prohibited set.
- Active-exploitation tools run only when `rules.active_exploitation: true`.
- A per-minute rate limit throttles target-facing actions.

There is intentionally **no override or bypass flag.** A denied action is logged and returned to the agent as feedback so it stays within bounds.

## 3. Always prohibited — in every mode, no exceptions

- **Denial of service** of any kind: volumetric floods, amplification, resource exhaustion, application-layer DoS.
- **Destructive actions:** deleting, encrypting, corrupting, or wiping data; ransomware or wiper behavior.
- **Mass / untargeted activity:** scanning or attacking hosts not named in scope; "internet-wide" scanning; spraying.
- **Self-propagating code:** worms, botnet behavior, persistence that spreads.
- **Supply-chain compromise** of upstream/third parties.
- **Exfiltration of real personal data.** Prove access with the minimum evidence; do not harvest user data.

## 4. Active exploitation — when enabled

With `rules.active_exploitation: true`, the red team may confirm exploitability against in-scope targets using standard tools (e.g. `sqlmap`, `nuclei`). Even then:

- The goal is **proof of impact**, not damage or takeover.
- Destructive / post-exploitation options are refused by the framework (e.g. sqlmap `--os-shell`, `--file-write`, `--dump-all`).
- Do not escalate to OS control, plant persistence, or pivot to out-of-scope systems.
- Prefer a read-only proof (a confirmed injection, a matched CVE template) over any state change.

## 5. Operational courtesy

- Keep a **contact** in the scope file and stop + notify if a target becomes unstable.
- Test during agreed windows; respect the rate limit (lower `max_rate` for fragile targets).
- Treat findings (in `findings.json` / `report.md`) as **sensitive**. They are gitignored by default — keep them that way.

## 6. Accountability

Every authorization decision and tool invocation is written to `engagements/<name>/audit.jsonl`. Retain it: it is the record of what was done, against what, and under whose authorization.

---

If you are unsure whether you are authorized to test something, you are not. Get written permission first.
