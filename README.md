# Ticket Resolution Assistant — Stage-0 Demo

A working proof that we can turn our **resolved** ManageEngine tickets into an
instant "how did we fix this before?" assistant for the Service Desk.

Type a new problem the way it lands in a ticket → it returns the most similar
past **resolved** tickets and their resolution notes. The analyst always decides;
the tool only suggests.

> **This is Stage 0: a zero-risk proof.**
> - Runs on **synthetic sample tickets** (`data/tickets.json`) — no real data.
> - **No live systems**, no ManageEngine connection, no cloud, no VM.
> - **No installs, no downloads, no internet** — Python standard library only.
> - Read-only by nature — it can't change anything.

---

## Run it

You need Python 3 (3.8+). Nothing else.

```bash
python app.py
```

Then open **http://localhost:8000** and try a query — or click an example.

To use a different port: `PORT=8080 python app.py`
(On some systems the command is `python3` instead of `python`.)

## Try these

- `User can't connect to the VPN, error 809`
- `can't reach internal systems from home`  ← note: **no word "VPN"**, still finds the remote-access fixes
- `Outlook stuck won't open`
- `account keeps locking`
- `my authenticator app isn't prompting me`

The second one is the point: it matches by **meaning**, not just keywords.

---

## What it proves

1. **The value is real** — past resolution notes answer new tickets, fast.
2. **The interaction is simple** — an analyst pastes a problem and gets fixes; nothing to learn.
3. **It's safe** — read-only, synthetic data, human stays in control, nothing leaves the machine.

## What it is *not* (yet)

- Not connected to ManageEngine (that's Phase 1, after approval + a read-only API key).
- Not hosted anywhere (Phase 1 runs on a small host in our Azure tenant).
- Not using a neural model — see below.

---

## How it works

```
data/tickets.json                 engine.py                     app.py + web/
(synthetic resolved     →   build a searchable index   →   web page: paste a
 tickets w/ resolution      of the problem text            problem, see the top
 notes)                     (match by meaning)             matching past fixes
```

- **`engine.py`** — the matcher. Stage 0 uses TF-IDF cosine similarity plus a
  domain **concept layer** (so "remote access", "work from home" and "VPN" all
  match), all in the standard library.
- **`app.py`** — a tiny standard-library web server (`/api/search`).
- **`web/index.html`** — the analyst-facing page.

### Phase-1 upgrade path (already designed for)

The matching backend is **pluggable**. `engine.py`'s `LexicalBackend` is the
zero-setup Stage-0 engine. Phase 1 drops in an `EmbeddingBackend` that returns
real vectors from a **local model (fastembed)** or **Azure OpenAI** — same
`fit / encode / similarity` interface, same web page, stronger matching. Only the
backend changes; everything the analyst sees stays the same.

---

## The path from here

| Stage | What | Needs |
|-------|------|-------|
| **0 — this demo** | Prove the workflow on synthetic data | Nothing (just runs) |
| **1 — live POC** | Connect read-only to our SDP Cloud, real (scrubbed) tickets, on a small Azure host | Manager OK · Cyber review · read-only OAuth · a host |
| **2 — measure** | Before/after MTTR & first-contact resolution with a few analysts | Pilot group |
| **3 — assist** | Suggested draft resolutions; optional Teams / in-SDP surface | Deeper integration |

Synthetic data only. Not connected to any company system.
