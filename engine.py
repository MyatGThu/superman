"""
Ticket Resolution Assistant — Stage-0 search engine.

Pure standard library. No pip installs, no model downloads, no network.
It matches a new problem against past *resolved* tickets and returns the
closest ones together with how they were fixed.

WHY THIS DESIGN
---------------
Stage 0's job is to prove the workflow with zero setup, so it runs anywhere —
including a locked-down corporate laptop that can't download an AI model.
Matching uses TF-IDF cosine similarity plus a domain "concept" layer so it can
match by meaning, not just shared words (e.g. "can't connect from home" finds a
"remote access failing" ticket).

PHASE-1 UPGRADE PATH
--------------------
The backend is pluggable. `LexicalBackend` (below) is the zero-dependency
Stage-0 engine. In Phase 1 you drop in an `EmbeddingBackend` that returns real
vectors from a local model (fastembed) or Azure OpenAI — same `fit/encode/
similarity` interface, same UI, same results shape. Nothing else changes.
"""

import json
import math
import re
from collections import Counter

STOPWORDS = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is",
    "are", "was", "were", "be", "been", "it", "this", "that", "they", "them",
    "i", "we", "you", "he", "she", "his", "her", "their", "my", "our", "at",
    "as", "by", "from", "but", "not", "no", "can", "cant", "cannot", "could",
    "will", "would", "has", "have", "had", "do", "does", "did", "so", "if",
    "when", "then", "than", "there", "here", "up", "out", "any", "all", "user",
    "users", "reports", "report", "reported", "please", "help", "issue", "still",
}

# Domain concepts: if any surface phrase appears in the text, its concept token
# is added to the bag. Both the query and the tickets get concept tokens, so
# they match on meaning even when the exact words differ.
CONCEPTS = {
    "vpn": {
        "label": "remote access / VPN",
        "terms": ["vpn", "remote access", "remote connection", "remote gateway",
                  "remote network", "tunnel", "anyconnect", "globalprotect",
                  "work from home", "working from home", "home office", "from home",
                  "remotely", "remote", "off site", "offsite"],
    },
    "account": {
        "label": "account / sign-in",
        "terms": ["account", "locked out", "lockout", "lock out", "password",
                  "reset password", "forgot password", "sign in", "signin",
                  "sign-in", "log in", "login", "logon", "log on", "credentials",
                  "authenticate", "authentication", "cannot sign in"],
    },
    "mfa": {
        "label": "multi-factor auth",
        "terms": ["mfa", "multi-factor", "multifactor", "2fa", "authenticator",
                  "push notification", "verification code", "one time code",
                  "otp", "token", "re-enroll", "reenroll"],
    },
    "email": {
        "label": "email / Outlook",
        "terms": ["email", "e-mail", "outlook", "mailbox", "mail", "inbox",
                  "o365", "office 365", "exchange", "smtp", "message", "messages",
                  "shared mailbox", "junk"],
    },
    "printing": {
        "label": "printing",
        "terms": ["printer", "print", "printing", "print queue", "spooler",
                  "print job", "print jobs", "printout"],
    },
    "network": {
        "label": "connectivity",
        "terms": ["network", "internet", "connectivity", "connection", "connect",
                  "cannot connect", "wifi", "wi-fi", "wireless", "ethernet",
                  "lan", "offline", "dropping", "drops", "no internet", "timing out",
                  "timeout", "unreachable"],
    },
    "hardware": {
        "label": "hardware / device",
        "terms": ["laptop", "desktop", "computer", "machine", "monitor", "display",
                  "screen", "resolution", "charger", "battery", "docking", "dock",
                  "keyboard", "mouse", "power", "wont turn on", "dead"],
    },
    "performance": {
        "label": "performance",
        "terms": ["slow", "freezing", "freeze", "freezes", "hang", "hangs",
                  "hanging", "lag", "unresponsive", "performance", "crash",
                  "crashes", "crashing", "stuck"],
    },
    "collab": {
        "label": "Teams / OneDrive / SharePoint",
        "terms": ["teams", "onedrive", "one drive", "sharepoint", "share point",
                  "sync", "syncing", "collaboration", "meeting", "call"],
    },
    "software": {
        "label": "software / apps",
        "terms": ["application", "app", "software", "program", "install",
                  "installation", "excel", "word", "office", "add-in", "addin",
                  "update", "upgrade"],
    },
    "mobile": {
        "label": "mobile device",
        "terms": ["phone", "mobile", "smartphone", "ios", "android", "cell",
                  "handset", "device"],
    },
    "access": {
        "label": "access request",
        "terms": ["access", "shared drive", "file share", "fileshare", "folder",
                  "permission", "permissions", "security group", "shared folder",
                  "denied", "grant access", "request access"],
    },
}

_WORD_RE = re.compile(r"[a-z0-9]+")


def _normalize(text):
    return " " + re.sub(r"[^a-z0-9]+", " ", text.lower()).strip() + " "


def _concept_tokens(raw_text):
    """Return concept tokens (with repeats) for every surface term present."""
    padded = _normalize(raw_text)
    tokens = []
    for cid, spec in CONCEPTS.items():
        for term in spec["terms"]:
            needle = " " + term.replace("-", " ") + " "
            if needle in padded:
                tokens.append("::" + cid)
    return tokens


def tokenize(text):
    """Content words (minus stopwords) plus domain concept tokens."""
    words = [w for w in _WORD_RE.findall(text.lower())
             if w not in STOPWORDS and len(w) > 1]
    return words + _concept_tokens(text)


def concept_label(token):
    if token.startswith("::"):
        spec = CONCEPTS.get(token[2:])
        if spec:
            return spec["label"]
    return None


class LexicalBackend:
    """Zero-dependency TF-IDF + cosine backend (Stage 0)."""

    name = "lexical (TF-IDF + domain concepts)"

    def __init__(self):
        self.idf = {}

    def fit(self, docs):
        n = len(docs)
        df = Counter()
        for doc in docs:
            for tok in set(tokenize(doc)):
                df[tok] += 1
        # smoothed idf
        self.idf = {tok: math.log((n + 1) / (c + 1)) + 1.0 for tok, c in df.items()}

    def encode(self, text):
        """Return an L2-normalized sparse vector {token: weight}."""
        counts = Counter(tokenize(text))
        vec = {tok: tf * self.idf.get(tok, math.log(1.0) + 1.0)
               for tok, tf in counts.items()}
        norm = math.sqrt(sum(w * w for w in vec.values())) or 1.0
        return {tok: w / norm for tok, w in vec.items()}

    @staticmethod
    def similarity(a, b):
        # dot product of two L2-normalized sparse vectors = cosine similarity
        if len(a) > len(b):
            a, b = b, a
        return sum(w * b.get(tok, 0.0) for tok, w in a.items())


class TicketSearch:
    def __init__(self, tickets, backend=None):
        self.tickets = tickets
        self.backend = backend or LexicalBackend()
        docs = [self._problem_text(t) for t in tickets]
        self.backend.fit(docs)
        self.vectors = [self.backend.encode(d) for d in docs]
        self.token_sets = [set(tokenize(d)) for d in docs]

    @staticmethod
    def _problem_text(t):
        # Match on the PROBLEM (subject + description); show the resolution.
        return f"{t['subject']} {t['description']}"

    def search(self, query, top_k=5, min_score=0.03):
        qv = self.backend.encode(query)
        q_tokens = set(tokenize(query))
        scored = []
        for i, dv in enumerate(self.vectors):
            score = self.backend.similarity(qv, dv)
            if score >= min_score:
                scored.append((score, i))
        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, i in scored[:top_k]:
            t = self.tickets[i]
            shared = q_tokens & self.token_sets[i]
            concepts = sorted({concept_label(tok) for tok in shared
                               if tok.startswith("::")} - {None})
            words = sorted(w for w in shared if not w.startswith("::"))
            results.append({
                "ticket": t,
                "score": round(score, 3),
                "matched_concepts": concepts,
                "matched_words": words[:6],
            })
        return results


def load_tickets(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)
