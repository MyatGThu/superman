---
name: pod-ip-screening
description: Screen a print-on-demand design, product title, tags, and ad copy for trademark, copyright, likeness, and platform-content-policy risk BEFORE anything is printed or listed. Use as a hard gate in the product pipeline, when writing listings or ad creative, and when a takedown notice arrives. Fills a confirmed ecosystem gap — no existing skill screens POD designs against IP and content policy, and takedowns/account flags are a routine solo-seller failure mode.
---

# POD IP & Content-Policy Screening

Purpose: keep the store's designs, listings, and ads legally clean. This is a **hard
gate** — a design that fails does not get printed, listed, or advertised, full stop.
(Enforcement is real and reaches small sellers: Coachella has pursued tiny and even
non-commercial "chella" targets; Harley-Davidson won $19M against a POD platform; Etsy's
trademark takedown process is automated and fast.)

This skill is risk screening, not legal advice — a lawyer decides edge cases.

## Screen every design + its listing text + its ad copy, in four passes

### Pass 1 — Trademark
- Names/logos/slogans of: festivals & events (Coachella, EDC, Tomorrowland, Ultra,
  Electric Forest, "-chella"/"-fest" coinages), sports teams & leagues, vehicle brands &
  model names, fashion/lifestyle brands, universities, bands/artists.
- Check text IN the artwork, the title, tags, description, AND paid-ad keywords (buying a
  trademark as an ad keyword is part of the Coachella v. Urban Outfitters pattern).
- Search USPTO TESS (tmsearch.uspto.gov) for exact and phonetic matches on any word/phrase
  in the design; search the phrase + "trademark" for known enforcement history.
- Generic descriptors are fine: "rave outfit", "festival wear", "lake life", "dog mom".
  Specific branded events/teams/models are never fine — including "inspired by" framing.

### Pass 2 — Copyright
- No traceable/derivative art from existing works, film/TV/game imagery, character art,
  album covers, or another seller's design (reverse-image-search the artwork; check the
  niche's Etsy top sellers for accidental convergence).
- AI-generated art: keep the generation prompt on file; reject outputs that reproduce a
  recognizable artist's signature style-with-subject or embed garbled brand marks.

### Pass 3 — Likeness / publicity rights
- No real people (celebrities, influencers, athletes) — face, name, nickname, or
  unmistakable silhouette — without a license. Includes "parody" portraits; right of
  publicity does not care that it's flattering.

### Pass 4 — Platform content policy
- Ad policy (Meta/TikTok): swim/intimates creative is moderated — no sexualized framing,
  no body-shaming implications, on-model imagery within platform nudity rules; expect
  higher friction and design creative accordingly.
- Marketplace policy (Etsy/Shopify Payments AUP): no hate symbols or coded hate slogans
  (check new slang/numbers against ADL Hate Symbols DB), no drug paraphernalia claims,
  no medical claims on garments, intimates listed per marketplace category rules.
- Consumables (year-two coffee line): label claims screened separately — no health
  claims; FDA labeling rules per the build repo's niche research.

## Output format

For each screened item return: `VERDICT: PASS | FAIL | LAWYER` with a one-line reason per
pass, and for FAIL the specific term/element to remove. Log every screen (date, design
id, verdict) to the build repo — the log is the defense record of good-faith process.

## When a takedown/notice arrives anyway

1. Do not ignore it; deadlines are short. 2. Pull the screen log for that design.
3. Delist immediately while assessing (delisting is reversible; a suspended store is not).
4. Counter-notice only with a lawyer. 5. Add the pattern to this skill's checklist.

## Related

`pod-product-factory` Gate 2 (this skill is that gate) · build repo docs/01 legal notes
per niche · sources: Rolling Stone Coachella v. Urban Outfitters, gerbenlaw.com,
dcist.com Moechella, redpoints.com Etsy takedowns, traverselegal.com POD brand protection.
