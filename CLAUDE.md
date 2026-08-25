# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the **skills and libraries repo** for the Amara Bay build (companion to
`myatgthu/lastone`, branch-matched on `claude/online-business-startup-plan-4jlir1`).
It contains no application code: only curated catalogs (`LIBRARIES.md`,
`ECOMMERCE-STACK.md`, `HOUSING-FINANCE-RESEARCH.md`) and custom Claude skills under
`skills/*/SKILL.md`.

Rules that matter here:

- **Skill format**: each skill is `skills/<name>/SKILL.md` with YAML frontmatter
  (`name` matching the directory, non-empty `description`). Quote any description
  containing a colon; the frontmatter must parse with a standard YAML parser.
- **Expansion policy (owner instruction)**: never rely only on existing skills. When a
  capability is missing, research the ecosystem first (the gap analysis in
  ECOMMERCE-STACK.md shows the method), adopt an external skill if one genuinely
  covers it, and build here only for real gaps. Re-survey at each build phase.
- **Catalog hygiene**: entries marked with a check were fetched and verified; unmarked
  entries came from search. Keep that distinction honest. `LIBRARIES.md` is refreshed
  by a scheduled job; do not hand-edit it in bulk.
- **Cross-references**: skills point into `lastone/docs/*` by path (the specs live
  there, the operating procedure lives here). Keep both sides working when renaming.
- **Never use em-dashes** in anything new (owner instruction, 2026-08-24). One logical
  change per commit. Push with `git push -u origin <branch>`, retrying network
  failures up to 4 times with 2s/4s/8s/16s backoff.
