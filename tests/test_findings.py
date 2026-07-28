from core.findings import Finding, FindingStore, Severity, Status


def test_severity_from_cvss():
    assert Severity.from_cvss(9.8) == Severity.CRITICAL
    assert Severity.from_cvss(7.5) == Severity.HIGH
    assert Severity.from_cvss(5.0) == Severity.MEDIUM
    assert Severity.from_cvss(2.0) == Severity.LOW
    assert Severity.from_cvss(0.0) == Severity.INFO


def test_severity_rank_order():
    assert Severity.CRITICAL.rank > Severity.HIGH.rank > Severity.MEDIUM.rank > Severity.LOW.rank > Severity.INFO.rank


def test_finding_stable_id():
    a = Finding("Missing HSTS", Severity.MEDIUM, "app.example.com", "web")
    b = Finding("Missing HSTS", Severity.LOW, "app.example.com", "web")
    assert a.id == b.id  # id ignores severity
    c = Finding("Missing HSTS", Severity.MEDIUM, "other.example.com", "web")
    assert a.id != c.id


def test_store_dedup_upgrades_severity():
    s = FindingStore()
    s.add(Finding("Missing HSTS", Severity.LOW, "app.example.com", "web"))
    s.add(Finding("Missing HSTS", Severity.HIGH, "app.example.com", "web"))
    assert len(s) == 1
    assert s.all()[0].severity == Severity.HIGH


def test_store_ordering_worst_first():
    s = FindingStore()
    s.add(Finding("a", Severity.LOW, "t1", "web"))
    s.add(Finding("b", Severity.CRITICAL, "t2", "web"))
    s.add(Finding("c", Severity.MEDIUM, "t3", "web"))
    assert [f.severity for f in s.all()] == [Severity.CRITICAL, Severity.MEDIUM, Severity.LOW]


def test_persist_roundtrip(tmp_path):
    path = tmp_path / "findings.json"
    s = FindingStore(path)
    s.add(Finding("X", Severity.HIGH, "t", "web", cve="CVE-2021-1", cvss=8.1))
    s.save()
    s2 = FindingStore(path)
    assert len(s2) == 1
    f = s2.all()[0]
    assert f.cve == "CVE-2021-1" and f.severity == Severity.HIGH


def test_cvss_derives_severity_when_default():
    f = Finding("X", Severity.INFO, "t", "web", cvss=9.1)
    assert f.severity == Severity.CRITICAL


def test_counts():
    s = FindingStore()
    s.add(Finding("a", Severity.HIGH, "t1", "web"))
    s.add(Finding("b", Severity.HIGH, "t2", "web"))
    assert s.counts()["high"] == 2
    assert s.counts()["low"] == 0


def test_status_filtering():
    s = FindingStore()
    f = s.add(Finding("a", Severity.HIGH, "t1", "web"))
    assert f in s.open()
    f.status = Status.VERIFIED
    assert f not in s.open()
