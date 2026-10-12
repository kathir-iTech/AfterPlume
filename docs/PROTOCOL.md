# Portable review protocol v1

A packet contains a strict `payload`, SHA-256 `digest`, attribution notice and optional transaction receipt. The digest is SHA-256 of the UTF-8 RFC 8785 canonical payload. The receipt is appended afterward, so it does not introduce a circular commitment.

The payload includes the original claim, source and interval, snapshot manifest, policy digest, all selected raw source records, computed finding, human response and local-assistance provenance. Numbers in provider CSV records remain original strings. The protocol rejects unexpected fields, duplicate decoded JSON keys, invalid date boundaries, non-finite numbers and malformed Unicode. File limits are 12 MB for packets and 20 MB for the source ZIP.

The browser and CLI verifier provide separate checks:

1. **Integrity** recomputes the canonical digest. A matching self-declared digest only establishes consistency.
2. **Snapshot inclusion and replay** checks the known original ZIP hash before unpacking, scans the complete plume CSV, selects every exact source match within provider calendar dates, compares raw and normalized records, validates policy and recomputes the finding. This establishes completeness within that pinned snapshot, not worldwide observation coverage.
3. **External commitment** reads the configured chain, successful receipt, publication event, deployment salt, owner, historical revision digest and current case status. A network failure yields `NOT_ESTABLISHED`. A prior matching digest may be superseded or withdrawn; acknowledgement of an earlier revision does not acknowledge the current revision.

Imported packet URLs are never automatically fetched. The built-in snapshot is selected by code, not by attacker-supplied links. HTML is rendered as React text. No executable content or wallet keys belong in a packet.

The separate CLI shares the schema and policy engine with the app. It is independent of browser state and the original author's screen, but is not an independent scientific auditor. A matching review does not establish repair, zero emissions, percentage reduction, operator responsibility, compliance or complete satellite coverage. The HTTPS ZIP is pinned by hash; it does not carry a UNEP digital signature.
