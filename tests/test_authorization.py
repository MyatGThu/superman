import pytest

from core.audit import AuditLog
from core.authorization import AuthorizationError, Guard
from core.scope import Scope


def _guard(active=True, rate=1000, **over):
    data = {
        "engagement": "t",
        "authorization": {"authorized": True, "authorized_by": "me", "attestation": "own", "expires": "2999-01-01"},
        "targets": ["*.example.com"],
        "out_of_scope": ["admin.example.com"],
        "rules": {"active_exploitation": active, "max_rate": rate},
    }
    data.update(over)
    return Guard(Scope.from_dict(data), AuditLog(), max_actions_per_minute=rate)


def test_in_scope_recon_allowed():
    assert _guard().check("port-scan", "app.example.com").allowed


def test_out_of_scope_denied():
    with pytest.raises(AuthorizationError):
        _guard().check("port-scan", "evil.com")


def test_out_of_scope_carveout_denied():
    with pytest.raises(AuthorizationError):
        _guard().check("port-scan", "admin.example.com")


def test_prohibited_keywords_always_denied():
    g = _guard()
    for action in ["ddos-flood", "wipe-disk", "ransomware-deploy", "mass-scan-internet"]:
        with pytest.raises(AuthorizationError):
            g.check(action, "app.example.com")


def test_active_exploitation_gated_off():
    with pytest.raises(AuthorizationError) as e:
        _guard(active=False).check("sqlmap", "app.example.com", active=True)
    assert "active exploitation" in str(e.value)


def test_active_exploitation_allowed_when_enabled():
    assert _guard(active=True).check("sqlmap", "app.example.com", active=True).allowed


def test_unauthorized_scope_denies_everything():
    g = _guard()
    g.scope.authorized = False
    with pytest.raises(AuthorizationError) as e:
        g.check("ping", "app.example.com")
    assert "not authorized" in str(e.value)


def test_engagement_prohibited_list():
    g = _guard(rules={"active_exploitation": True, "max_rate": 100, "prohibited": ["bruteforce"]})
    with pytest.raises(AuthorizationError):
        g.check("bruteforce-login", "app.example.com")


def test_rate_limit_enforced():
    g = _guard(rate=3)
    for _ in range(3):
        g.check("probe", "app.example.com")
    with pytest.raises(AuthorizationError) as e:
        g.check("probe", "app.example.com")
    assert "rate limit" in str(e.value)


def test_is_allowed_never_raises():
    g = _guard()
    assert g.is_allowed("port-scan", "app.example.com") is True
    assert g.is_allowed("port-scan", "evil.com") is False


def test_denials_are_audited():
    audit = AuditLog()
    g = Guard(Scope.from_dict({
        "engagement": "t",
        "authorization": {"authorized": True, "authorized_by": "m", "attestation": "o"},
        "targets": ["*.example.com"], "rules": {"active_exploitation": False},
    }), audit)
    try:
        g.check("scan", "evil.com")
    except AuthorizationError:
        pass
    assert any(e.kind == "authorization" and e.allowed is False for e in audit.events)
