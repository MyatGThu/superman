"""
Ticket Resolution Assistant — Stage-0 demo server.

Pure standard library. Run it, open the page, paste a new ticket, and see the
most similar *resolved* tickets and how they were fixed.

    python app.py            # then open http://localhost:8000

No pip install, no model download, no internet, no live systems. The data in
data/tickets.json is SYNTHETIC — safe to demo to anyone.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from engine import TicketSearch, load_tickets

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8000"))

TICKETS = load_tickets(os.path.join(HERE, "data", "tickets.json"))
INDEX = TicketSearch(TICKETS)

EXAMPLES = [
    "User can't connect to the VPN, error 809",
    "Can't reach internal systems while working from home",
    "Outlook is stuck loading and won't open",
    "Not receiving any emails since this morning",
    "Account keeps getting locked out",
    "Printer shows offline and won't print",
    "Wi-Fi keeps dropping on my laptop",
    "Teams call has no sound",
]


def _page():
    with open(os.path.join(HERE, "web", "index.html"), "r", encoding="utf-8") as fh:
        return fh.read()


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            self._send(200, _page(), "text/html; charset=utf-8")
            return
        if parsed.path == "/api/examples":
            self._send(200, json.dumps({"examples": EXAMPLES}))
            return
        if parsed.path == "/api/stats":
            self._send(200, json.dumps({
                "ticket_count": len(TICKETS),
                "backend": INDEX.backend.name,
            }))
            return
        if parsed.path == "/api/search":
            q = (parse_qs(parsed.query).get("q", [""])[0] or "").strip()
            if not q:
                self._send(200, json.dumps({"query": q, "results": []}))
                return
            results = INDEX.search(q, top_k=5)
            self._send(200, json.dumps({"query": q, "results": results}))
            return
        self._send(404, json.dumps({"error": "not found"}))

    def log_message(self, *args):
        pass  # keep the console quiet


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("=" * 60)
    print("  Ticket Resolution Assistant — Stage-0 demo")
    print("=" * 60)
    print(f"  Loaded {len(TICKETS)} synthetic resolved tickets")
    print(f"  Matching backend: {INDEX.backend.name}")
    print(f"\n  Open:  http://localhost:{PORT}\n")
    print("  Press Ctrl+C to stop.")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()
        sys.exit(0)


if __name__ == "__main__":
    main()
