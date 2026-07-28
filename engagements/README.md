# Engagements

Each engagement lives in its own folder here and is defined by a `scope.yaml`
that declares **what is authorized** and **the rules**. Everything the agents
produce for that engagement is written alongside it.

```
engagements/
  example/
    scope.yaml        # the template — copy it, don't run it (authorized: false)
  <your-engagement>/
    scope.yaml        # your authorized scope
    findings.json     # discovered findings (red writes, blue updates)  [gitignored]
    audit.jsonl       # append-only log of every decision & action       [gitignored]
    report.md         # generated assessment + remediation report         [gitignored]
    hardening/        # generated hardening artifacts                      [gitignored]
```

## Create one

```bash
python setup/bootstrap.py --new-engagement myhomelab
$EDITOR engagements/myhomelab/scope.yaml
python red-team/run.py check-scope --scope engagements/myhomelab/scope.yaml
```

Set in the scope file:
- `targets:` — the hosts/domains/CIDRs/URLs/repos you may test.
- `out_of_scope:` — explicit carve-outs (e.g. a shared gateway).
- `authorization.authorized: true` **plus** `authorized_by` and `attestation` — your statement that you own or are permitted to test these targets.
- `rules.active_exploitation` — whether the red team may attempt real exploits.

## Results are sensitive

`findings.json`, `audit.jsonl`, `report.md`, and `hardening/` can contain
sensitive detail about real weaknesses. They are **gitignored by default**.
Keep them that way; share reports through a secure channel, not the repo.
