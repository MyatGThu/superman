"""Network reconnaissance: a bounded pure-Python TCP connect scan, plus an
nmap adapter for richer service/version detection when nmap is installed.

Neither is "active exploitation" — they enumerate reachable services. To avoid
becoming a mass scanner, the pure-Python scan caps the number of ports per call
and the nmap adapter targets a single host with a bounded top-ports count.
"""

from __future__ import annotations

import socket
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

from ..findings import Finding, Severity
from ..tooling import ToolAdapter, ToolContext, ToolResult, safe_run

COMMON_PORTS = {
    21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "dns", 80: "http", 110: "pop3",
    111: "rpcbind", 135: "msrpc", 139: "netbios", 143: "imap", 443: "https", 445: "smb",
    587: "smtp-sub", 993: "imaps", 995: "pop3s", 1433: "mssql", 1521: "oracle", 2049: "nfs",
    3000: "dev-http", 3306: "mysql", 3389: "rdp", 5432: "postgres", 5900: "vnc", 6379: "redis",
    8000: "http-alt", 8080: "http-proxy", 8443: "https-alt", 9200: "elasticsearch", 27017: "mongodb",
}
# Services that are risky to expose to untrusted networks.
RISKY = {23: "telnet (cleartext)", 3389: "rdp", 5900: "vnc", 6379: "redis (often unauth)",
         9200: "elasticsearch (often unauth)", 27017: "mongodb (often unauth)", 3306: "mysql",
         5432: "postgres", 1433: "mssql", 445: "smb", 135: "msrpc"}
MAX_PORTS = 200


def _host(raw: str) -> str:
    return urlparse(raw).hostname or raw.split("/")[0].split(":")[0]


class TcpPortScan(ToolAdapter):
    name = "tcp_port_scan"
    category = "network"
    target_param = "host"
    description = ("TCP connect scan of a single host against common ports (or a supplied list). "
                   "Reports which ports are open. Capped at 200 ports per call.")
    parameters = {"type": "object", "properties": {
        "host": {"type": "string"},
        "ports": {"type": "array", "items": {"type": "integer"},
                  "description": "Optional explicit port list; defaults to common ports."}},
        "required": ["host"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        host = _host(params["host"])
        ports = params.get("ports") or sorted(COMMON_PORTS)
        if len(ports) > MAX_PORTS:
            return ToolResult(self.name, ok=False, target=host,
                              summary=f"refused: {len(ports)} ports exceeds cap of {MAX_PORTS}; narrow the range.")
        try:
            ip = socket.gethostbyname(host)
        except socket.gaierror as e:
            return ToolResult(self.name, ok=False, target=host, summary=f"DNS resolution failed: {e}")
        # Recheck the RESOLVED ip against exclusions: an in-scope name must not
        # resolve to an out-of-scope address (DNS misdirection / rebinding).
        if ctx.scope.is_excluded(ip):
            return ToolResult(self.name, ok=False, target=host,
                              summary=f"refused: {host} resolves to {ip}, which is out of scope.")

        open_ports: list[int] = []

        def probe(port: int):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.0)
                if s.connect_ex((ip, port)) == 0:
                    open_ports.append(port)

        with ThreadPoolExecutor(max_workers=min(50, len(ports))) as ex:
            list(ex.map(probe, ports))
        open_ports.sort()

        findings: list[Finding] = []
        for p in open_ports:
            if p in RISKY:
                findings.append(Finding(
                    title=f"Sensitive service exposed: {RISKY[p]} on port {p}", severity=Severity.MEDIUM,
                    target=f"{host}:{p}", category="network",
                    evidence=f"TCP {p} open on {ip}",
                    remediation=f"Firewall port {p} to trusted sources, require auth/TLS, or move it off the public interface."))
        listing = ", ".join(f"{p}/{COMMON_PORTS.get(p,'?')}" for p in open_ports) or "(none open)"
        return ToolResult(self.name, target=host,
                          summary=f"{host} ({ip}): {len(open_ports)} open of {len(ports)} scanned",
                          output=f"Open: {listing}", findings=findings)


class NmapScan(ToolAdapter):
    name = "nmap_scan"
    category = "network"
    target_param = "host"
    requires = ("nmap",)
    description = ("Service/version detection with nmap (top ports). Richer than tcp_port_scan when nmap "
                   "is installed. Uses -sV -Pn against a single host.")
    parameters = {"type": "object", "properties": {
        "host": {"type": "string"},
        "top_ports": {"type": "integer", "default": 200, "description": "How many top ports (max 1000)."}},
        "required": ["host"]}

    def run(self, params: dict, ctx: ToolContext) -> ToolResult:
        if not self.available():
            return self._unavailable(params.get("host", ""))
        host = _host(params["host"])
        try:  # recheck resolved ip against exclusions before handing host to nmap
            if ctx.scope.is_excluded(socket.gethostbyname(host)):
                return ToolResult(self.name, ok=False, target=host,
                                  summary=f"refused: {host} resolves out of scope.")
        except socket.gaierror as e:
            return ToolResult(self.name, ok=False, target=host, summary=f"DNS resolution failed: {e}")
        top = max(1, min(int(params.get("top_ports", 200)), 1000))
        res = safe_run(["nmap", "-Pn", "-sV", "-T3", "--top-ports", str(top), host],
                       timeout=ctx.settings.tool_timeout)
        if res.not_found:
            return self._unavailable(host)
        summary = f"nmap {host}: rc={res.returncode}" + (" (timed out)" if res.timed_out else "")
        return ToolResult(self.name, ok=res.ok, target=host, summary=summary, output=res.stdout or res.stderr)
