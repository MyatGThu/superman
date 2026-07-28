"""Regression tests for issues found in the adversarial review."""

import socket
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from core.audit import AuditLog
from core.authorization import AuthorizationError, Guard
from core.config import Settings
from core.engine import Agent
from core.findings import Finding, FindingStore, Severity, Status
from core.scope import Scope
from core.tooling import ToolContext
from core.tools import build_red_registry
from core.tools.common import http_fetch
from core.tools.remediation import VerifyFix


# ---------- shared helpers -------------------------------------------------
def _scope(**over):
    data = {
        "engagement": "t",
        "authorization": {"authorized": True, "authorized_by": "me", "attestation": "own", "expires": "2999-01-01"},
        "targets": ["127.0.0.1", "*.example.com"],
        "rules": {"active_exploitation": True, "max_rate": 1000},
    }
    data.update(over)
    return Scope.from_dict(data)


def _ctx(scope=None):
    scope = scope or _scope()
    audit = AuditLog()
    return ToolContext(Guard(scope, audit, 1000), audit, Settings(), FindingStore(), scope)


# ---------- finding 1: confused-deputy -------------------------------------
def test_guard_checks_the_param_the_adapter_uses_not_a_decoy():
    ctx = _ctx()
    agent = Agent("red-team", "sys", build_red_registry(), ctx, ctx.settings)
    # url (what SecurityHeaders actually fetches) is out of scope; a decoy in-scope
    # "target" must NOT launder it past the Guard.
    allowed, text = agent._dispatch("http_security_headers", {"url": "http://evil.com", "target": "127.0.0.1"})
    assert allowed is False and "DENIED" in text


def test_decoy_out_of_scope_extra_key_is_also_denied():
    ctx = _ctx()
    agent = Agent("red-team", "sys", build_red_registry(), ctx, ctx.settings)
    # primary (repo) in scope path-wise but a decoy out-of-scope host present.
    allowed, text = agent._dispatch("tcp_port_scan", {"host": "127.0.0.1", "url": "http://evil.com"})
    assert allowed is False and "DENIED" in text


# ---------- finding 2: redirects not followed ------------------------------
class _RedirectHandler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        self.send_response(302)
        self.send_header("Location", "http://example.com/elsewhere")
        self.end_headers()


def test_http_fetch_does_not_follow_cross_host_redirect():
    httpd = HTTPServer(("127.0.0.1", 0), _RedirectHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        resp = http_fetch(f"http://127.0.0.1:{httpd.server_address[1]}/")
        assert resp.status == 302
        assert "example.com" in resp.headers.get("location", "")  # surfaced, not chased
    finally:
        httpd.shutdown()


# ---------- finding 3: CIDR exclusions resolve hostnames -------------------
def test_out_of_scope_cidr_excludes_resolving_hostname():
    if not any(str(ip) == "127.0.0.1" for ip in _resolve_localhost()):
        pytest.skip("localhost does not resolve to 127.0.0.1 here")
    s = _scope(targets=["*.example.test", "localhost"], out_of_scope=[{"target": "127.0.0.0/8", "type": "cidr"}])
    allowed, reason = s.is_in_scope("localhost")
    assert allowed is False and "out-of-scope" in reason


def test_in_scope_cidr_matches_resolving_hostname():
    if not any(str(ip) == "127.0.0.1" for ip in _resolve_localhost()):
        pytest.skip("localhost does not resolve to 127.0.0.1 here")
    s = _scope(targets=[{"target": "127.0.0.0/8", "type": "cidr"}])
    assert s.is_in_scope("localhost")[0] is True


def _resolve_localhost():
    from core.scope import _resolve
    return _resolve("localhost")


# ---------- finding 4/6: verify_fix ---------------------------------------
class _EnvHandler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/.env":
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"SECRET=abc123def456\n")
        else:
            self.send_response(404)
            self.end_headers()


@pytest.fixture()
def env_server():
    httpd = HTTPServer(("127.0.0.1", 0), _EnvHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()


def test_verify_fix_keeps_still_exposed_path_open(env_server):
    ctx = _ctx()
    f = ctx.findings.add(Finding("Exposed path: /.env", Severity.CRITICAL, env_server + "/.env", "web"))
    res = VerifyFix().run({"finding_id": f.id}, ctx)
    assert f.status != Status.VERIFIED
    assert "STILL PRESENT" in res.summary


def test_verify_fix_verifies_removed_path(env_server):
    ctx = _ctx()
    f = ctx.findings.add(Finding("Exposed path: /removed-secret", Severity.HIGH, env_server + "/removed-secret", "web"))
    res = VerifyFix().run({"finding_id": f.id}, ctx)
    assert f.status == Status.VERIFIED
    assert "VERIFIED" in res.summary


def test_verify_fix_tls_retest_preserves_port():
    f = Finding("Weak TLS protocol negotiated: TLSv1", Severity.MEDIUM, "host.example.com:8443", "tls")
    adapter, params_in, host = VerifyFix()._retest_for(f)
    assert params_in.get("port") == 8443 and host == "host.example.com"


def test_verify_fix_inconclusive_retest_not_marked_verified():
    ctx = _ctx()
    # target resolves nowhere -> TLS connect fails -> result not ok, no findings.
    f = ctx.findings.add(Finding("Expired TLS certificate", Severity.HIGH,
                                 "app.example.com:65000", "tls"))
    res = VerifyFix().run({"finding_id": f.id}, ctx)
    assert f.status != Status.VERIFIED
    assert "inconclusive" in res.summary.lower() or "STILL" in res.summary


# ---------- finding 5: params scanned for prohibited intent ---------------
def test_prohibited_keyword_in_params_denied():
    g = Guard(_scope(), AuditLog(), 1000)
    with pytest.raises(AuthorizationError):
        g.check("note", "127.0.0.1", params={"text": "please wipe everything on the box"})


def test_engagement_prohibited_matches_params():
    g = Guard(_scope(rules={"active_exploitation": True, "max_rate": 1000, "prohibited": ["dbs"]}), AuditLog(), 1000)
    with pytest.raises(AuthorizationError):
        g.check("sqlmap_test", "app.example.com", active=True, params={"enumerate": "dbs"})


def test_ambiguous_short_token_not_matched_in_params():
    # "dos" must not match a hostname like "dos-api" inside params.
    g = Guard(_scope(), AuditLog(), 1000)
    assert g.check("http_security_headers", "app.example.com", params={"url": "https://dos-api.example.com"}).allowed


# ---------- finding 9: credential-testing gate ----------------------------
def test_credential_testing_gated_off_by_default():
    g = Guard(_scope(), AuditLog(), 1000)  # allow_credential_testing defaults False
    with pytest.raises(AuthorizationError) as e:
        g.check("ssh_bruteforce", "app.example.com", active=True)
    assert "credential testing" in str(e.value)


def test_credential_testing_allowed_when_enabled():
    g = Guard(_scope(rules={"active_exploitation": True, "max_rate": 1000, "allow_credential_testing": True}),
              AuditLog(), 1000)
    assert g.check("ssh_bruteforce", "app.example.com", active=True).allowed


# ---------- finding 7: settings clamp -------------------------------------
def test_settings_clamp_nonpositive_iterations():
    assert Settings(max_iterations=0).max_iterations == 1
    assert Settings(max_iterations=-5).max_iterations == 1
