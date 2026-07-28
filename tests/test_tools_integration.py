"""Integration tests for the pure-Python tools and the engine's guarded
dispatch, exercised against a local throwaway HTTP server (no SDK, no network).
"""

import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from core.audit import AuditLog
from core.authorization import Guard
from core.config import Settings
from core.engine import Agent
from core.findings import FindingStore, Severity
from core.scope import Scope
from core.tooling import ToolContext
from core.tools import build_red_registry
from core.tools.web_recon import SecurityHeaders
from core.tools.web_vuln import ExposedPathsProbe


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silence
        pass

    def do_GET(self):
        if self.path == "/.env":
            body = b"SECRET_KEY=supersecretvalue123\nDB_PASSWORD=hunter2hunter2\n"
        elif self.path == "/.git/HEAD":
            body = b"ref: refs/heads/main\n"
        else:
            body = b"<html>hello</html>"
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Server", "TestServer/1.0")  # info disclosure
        self.end_headers()
        self.wfile.write(body)


@pytest.fixture()
def server():
    httpd = HTTPServer(("127.0.0.1", 0), _Handler)
    port = httpd.server_address[1]
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()


def _ctx():
    scope = Scope.from_dict({
        "engagement": "test",
        "authorization": {"authorized": True, "authorized_by": "t", "attestation": "own", "expires": "2999-01-01"},
        "targets": ["127.0.0.1"],
        "rules": {"active_exploitation": False, "max_rate": 1000},
    })
    audit = AuditLog()
    return ToolContext(Guard(scope, audit, 1000), audit, Settings(), FindingStore(), scope), scope


def test_security_headers_flags_missing(server):
    ctx, _ = _ctx()
    res = SecurityHeaders().run({"url": server}, ctx)
    titles = {f.title for f in res.findings}
    assert any("strict-transport-security" in t for t in titles)
    assert any("content-security-policy" in t for t in titles)
    assert any("'server'" in t.lower() for t in titles)  # info disclosure header


def test_exposed_paths_probe_finds_secrets(server):
    ctx, _ = _ctx()
    res = ExposedPathsProbe().run({"url": server}, ctx)
    by_target = {f.target.rsplit("/", 1)[-1]: f for f in res.findings}
    assert ".env" in by_target and by_target[".env"].severity == Severity.CRITICAL
    assert "HEAD" in by_target  # /.git/HEAD


def test_engine_dispatch_denies_out_of_scope(server):
    ctx, _ = _ctx()
    agent = Agent("red-team", "sys", build_red_registry(), ctx, ctx.settings)
    allowed, text = agent._dispatch("http_security_headers", {"url": "http://example.org"})
    assert allowed is False and "DENIED" in text


def test_engine_dispatch_runs_in_scope(server):
    ctx, _ = _ctx()
    agent = Agent("red-team", "sys", build_red_registry(), ctx, ctx.settings)
    allowed, text = agent._dispatch("http_security_headers", {"url": server})
    assert allowed is True
    assert len(ctx.findings) > 0


def test_engine_dispatch_gates_active_exploit(server):
    ctx, _ = _ctx()  # active_exploitation is False
    agent = Agent("red-team", "sys", build_red_registry(), ctx, ctx.settings)
    allowed, text = agent._dispatch("sqlmap_test", {"url": server + "/?id=1"})
    assert allowed is False and "active exploitation" in text
