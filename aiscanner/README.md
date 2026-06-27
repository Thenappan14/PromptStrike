# MCP Security Scanner

A small web app: enter a URL, get a non-destructive security assessment mapped to the
8 MCP security servers.

## Run

```bash
cd scanner-app
node server.js
# open http://localhost:8787
```

No dependencies — pure Node (uses built-in `http`, `tls`, `net`, `dns`, plus system `openssl`).

## What runs against a URL

| MCP server        | Phase                          | Status in a URL-only scan |
|-------------------|--------------------------------|---------------------------|
| VirusTotal MCP    | Domain reputation / threat intel | **live** (needs `VIRUSTOTAL_API_KEY`) |
| nmap MCP          | Open-port / service exposure     | **live** (TCP-connect scan, top ports) |
| Awesome Kali MCP  | TLS versions + security headers  | **live** |
| Snyk CLI MCP      | Dependency CVEs                  | **live** with repo-path field (needs `snyk auth` once) |
| Postman MCP       | API auth / CORS / error leakage  | **live** with API-endpoint-URL field |
| WireMCP           | Cleartext secrets in traffic     | **live** with .pcap-path field (uses `strings`) |
| Container-MCP     | Static file inspection + VT hash | **live** with file-path field (never executes the file) |

Fill the **Optional inputs** disclosure under the URL box to activate the last four.
Each phase is **skipped** (with a reason) until its input is supplied — never faked.

## API keys

Copy `.env.example` to `.env` and set your key:

```bash
cp .env.example .env
# edit .env → VIRUSTOTAL_API_KEY=...
```

- `VIRUSTOTAL_API_KEY` (required for reputation + file-hash lookups). Get one free at
  https://www.virustotal.com/. Can also be supplied via the environment variable of the same name.
- The `.env` file is git-ignored so your key is never committed.

## Notes

- **Authorization gate:** the UI requires you to confirm you're authorized; the API rejects
  requests without `authorized: true`. Only scan hosts you own or have written permission to test.
- **Non-destructive:** reputation lookups, a TCP-connect port check, TLS handshakes, and a
  single GET for headers. No exploitation, brute-forcing, or DoS.
- **TLS legacy check** shells out to system `openssl` because Node's bundled OpenSSL refuses
  to initiate TLS 1.0/1.1 (which would give false negatives).
