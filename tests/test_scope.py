from datetime import date, timedelta

from core.scope import Scope, Target, TargetType, classify


def test_classify():
    assert classify("https://a.example.com/x") == TargetType.URL
    assert classify("*.example.com") == TargetType.DOMAIN
    assert classify("10.0.0.0/24") == TargetType.CIDR
    assert classify("10.0.0.5") == TargetType.HOST
    assert classify("git@github.com:me/repo.git") == TargetType.REPO
    assert classify("app.example.com") == TargetType.HOST


def _scope(**over):
    data = {
        "engagement": "t",
        "authorization": {"authorized": True, "authorized_by": "me", "attestation": "own", "expires": "2999-01-01"},
        "targets": ["*.example.com", "10.0.0.0/24", "https://shop.test"],
        "out_of_scope": ["admin.example.com", "10.0.0.1"],
        "rules": {"active_exploitation": True, "max_rate": 60},
    }
    data.update(over)
    return Scope.from_dict(data)


def test_domain_matches_subdomains():
    s = _scope()
    assert s.is_in_scope("https://app.example.com/login")[0] is True
    assert s.is_in_scope("example.com")[0] is True
    assert s.is_in_scope("deep.sub.example.com")[0] is True


def test_out_of_scope_wins():
    s = _scope()
    assert s.is_in_scope("admin.example.com")[0] is False
    assert s.is_in_scope("10.0.0.1")[0] is False


def test_cidr_membership():
    s = _scope()
    assert s.is_in_scope("10.0.0.55")[0] is True
    assert s.is_in_scope("10.0.1.55")[0] is False


def test_unrelated_target_denied():
    s = _scope()
    assert s.is_in_scope("https://evil.com")[0] is False
    assert s.is_in_scope("8.8.8.8")[0] is False


def test_readiness_requires_attestation():
    assert _scope().is_ready() is True
    bad = _scope(authorization={"authorized": True, "authorized_by": "", "attestation": ""})
    assert bad.is_ready() is False
    assert any("attestation" in p for p in bad.authorization_problems())


def test_expired_authorization_not_ready():
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    s = _scope(authorization={"authorized": True, "authorized_by": "me", "attestation": "own", "expires": yesterday})
    assert s.is_ready() is False
    assert any("expired" in p for p in s.authorization_problems())


def test_unauthorized_flag_not_ready():
    s = _scope(authorization={"authorized": False})
    assert s.is_ready() is False


def test_explicit_type_preserved():
    t = Target(raw="internal", type="host")
    assert t.type == TargetType.HOST
