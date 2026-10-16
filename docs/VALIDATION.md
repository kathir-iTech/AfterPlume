# Measured validation

These are reproducible prototype engineering checks. There is no independent practitioner pilot, measured investigation-time saving, user adoption or demonstrated emissions reduction. The [pilot protocol](PILOT.md) is prepared and has not been conducted.

## Current checks

| Check | Observed result | Reproduce |
| --- | --- | --- |
| TypeScript | Passed; strict types and unused-code checks enabled | `npm run typecheck` |
| Unit suite | 65 passed: 54 evidence/packet, 3 timeline, 3 transport, 2 workspace and 3 readable-report checks | `npm test` |
| Solidity roles and revisions | 19 passed on a local EVM | `npm run contracts:test` |
| Browser acceptance | 19 stories passed locally, including actual on-device model inference | `npm run test:e2e` |
| Production build | Passed; static deployment, no core API secrets | `npm run build` |
| Dependency advisory audit | Zero known vulnerabilities at the release audit, including development dependencies | `npm audit --audit-level=moderate` |
| Source catalogue consistency | All 4,211 source counts match the original archive | `npm run evaluate:batch` |
| Selected interval | Three detections for AZE_S_010, 2026-05-01 included to 2026-06-02 excluded | `npm run samples` then CLI verify |
| Omit a record and rehash | Integrity matches; source completeness fails | `npm test` or the verifier omission exercise |

The browser suite checks source selection, user-entered statements/references, human decisions, JSON export and automatic file replay; source-scoped revisions; saved-work recovery; rejection of modified saved evidence; preservation of drafts when switching cases; stale-request rejection; model failure and accepted keyword provenance; actual semantic inference; result-card export; all-source CSV export; proof replay; keyboard navigation and deep links; reduced motion; and layouts down to 320 pixels. The first visit has one primary action and fewer than 100 visible main-content words.

The new report story completes a review, downloads the actual standalone HTML, opens it from disk, checks all three records and the statement reference, and confirms pasted HTML is displayed as text without executing or requesting remote resources. Unit checks also cover escaping, practice/draft labels, source fingerprints, missing quantification and an explicitly reported zero. Reports are reading copies, not verification certificates; the JSON packet remains the replayable artifact.

## Source transport and replay

The original ZIP contains 30,319 plume records and 4,211 sources. A pinned 2,816,026-byte gzip envelope restores the exact 10,763,023-byte archive. Its envelope hash is checked before decompression, followed by the original archive SHA-256 before unpacking. Both browsing and verification retain the original CSV records. A historical production diagnostic took 52.8 seconds to download the original ZIP on one connection; this is not a general latency benchmark.

The batch evaluation uses the same hypothetical no-recorded-detections interval for every source: 2026-05-01 included to 2026-06-02 excluded. There are 334 sources with matching detections and 3,877 without matching records. The report retains every result in `evaluation/results/batch.json`. These counts describe the snapshot, not real operator statements or a dishonesty ranking. No matching records cannot establish zero emissions.

The CLI reports integrity, source replay and blockchain checks separately. Exit code 0 means required integrity/replay checks passed (and a matching anchor if attached), 1 means mismatch, 2 means input/runtime error and 3 means a required check was not established. An unpublished review can pass integrity and source replay while correctly reporting no external commitment.

## Guidance retrieval evaluation

| Measurement | Recorded result | Evidence |
| --- | --- | --- |
| Authored holdout top-1 | Hybrid 16/18; BM25 14/18 | `evaluation/results/retrieval.json` |
| Authored holdout top-3 | Hybrid 18/18 | Same report |
| Local Node query inference | p50 22.4 ms; p95 66.3 ms across 60 queries | Same report |
| Earlier semantic-only browser UI | Cold 29.34 s; warm p50 414 ms, p95 562 ms over 20 runs | `evaluation/results/browser.json` |
| Browser page errors during that benchmark | Zero observed | Same report |

There are ten authored, cited guidance cards and 60 authored queries in ten scenario groups. Seven whole groups (42 queries) form development; three whole groups (18 queries) form holdout. No model weights or score thresholds were tuned. This is a small author-labelled guidance-retrieval test, not population performance, methane detection, fraud accuracy, claim-type classification accuracy or a human study. All retrieval engines and results are retained. Immediate keyword help in the current interface lets users proceed during model loading; the earlier cold UI time is not a mandatory wait for a review.

Recorded device: Intel Celeron N4500, Windows x64, approximately 12.7 GB physical memory, Node 24.18.1; Chrome 155, two reported logical threads, single-thread WASM. Browser UI timings include Playwright polling and rendering; rounded inference durations are stored separately. Cold timing includes the model, WASM runtime and reference-note embeddings. Results depend on device, browser cache, network and other activity.

Prepared model files total 23,685,172 bytes. The WASM runtime adds 26,861,777 bytes plus a 53,057-byte module. These are uncompressed artifact sizes, not measured transfer or browser memory. Inference stays in the browser, and the evidence policy does not require the model.

## Registry execution

`evaluation/results/ledger.json` and `evaluation/results/browser-ledger.json` record actual local EVM publication, distinct reviewer authorization, acknowledgement, revision replacement, historical acknowledgement and terminal withdrawal. Reproduce with `npm run chain:local`, `npm run chain:deploy`, then `npm run ledger:walkthrough` or `npm run ledger:browser` with the web server running.

Both disposable actors are controlled by the test. This is a local, resettable chain, not a public Sepolia deployment, a durable public anchor or an independent reviewer pilot. The verifier checks compiled runtime bytecode, deployment salt, receipt, event, owner, digest, predecessor and state at an observed block. No receipt is interpreted as scientific certification.

## Dependency review

`fflate` 0.8.3 addresses the [malformed ZIP64 advisory](https://github.com/advisories/GHSA-px8p-9vwx-vf98). A scoped `tmp` 0.2.7 override fixes [path traversal](https://github.com/advisories/GHSA-ph9p-34f9-6g65) and [type confusion](https://github.com/advisories/GHSA-7c78-jf6q-g5cm) in the compiler's tooling dependency while preserving Solidity 0.8.28 and the pinned registry bytecode. CI audits moderate and higher advisories. An advisory audit is not a complete security certification.
