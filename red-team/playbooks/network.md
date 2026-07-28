# Red Team Playbook — Network & Homelab

For hosts and subnets (a homelab `10.0.0.0/24`, a self-hosted box, business infra) in scope.

## 1. Host discovery & port mapping
- `tcp_port_scan` per in-scope host (common ports, capped at 200/call). Supply a focused `ports` list for speed.
- `nmap_scan` for service/version detection when nmap is installed (`-sV`, top ports).
- Work host-by-host; never expand to hosts not named in the scope (the Guard will deny it anyway).

## 2. Service assessment
For each open port, identify the service and check for the classic exposures:
- **SSH (22)** — version, password auth allowed, weak algorithms.
- **RDP (3389) / VNC (5900)** — exposed remote desktop is high-risk.
- **Databases (3306/5432/1433/6379/27017/9200)** — exposed to the network, often unauthenticated (Redis/Elasticsearch/Mongo especially). The scanner flags these as sensitive automatically.
- **SMB (445) / RPC (135/139)** — exposed file sharing / RPC.
- **Web mgmt panels (8080/8443/3000/9000)** — routers, dashboards, CI, admin UIs.
- **Telnet (23), FTP (21)** — cleartext protocols.

## 3. Web-facing services on the host
Any HTTP(S) service found → switch to the **web-app** playbook for that URL (headers, TLS, exposed paths, nuclei).

## 4. Verification (only if `active_exploitation: true`)
- `known_cve_verify` against a service that fingerprinted to a vulnerable version.
- Default/weak credentials only if `allow_credential_testing: true`, and always throttled (no lockout-inducing spraying).
- Prove the exposure minimally; do not alter data or configuration.

## 5. Record & prioritize
`record_finding` per exposure — exposed sensitive service, weak/expired TLS, cleartext protocol, unauthenticated datastore, outdated vulnerable service. Rank by real network exposure (internet-facing > LAN-only). Hand off to Blue Team for firewalling, auth, and patching.

**Never** run volumetric scans, stress/flood a service, or touch the gateway/other hosts unless explicitly in scope.
