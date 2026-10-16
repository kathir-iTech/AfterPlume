# Measured validation

Reports are generated from actual executions. They are prototype engineering measurements, not independent scientific validation or user outcomes.

The final dependency review pins `fflate` to 0.8.3 to address [the malformed ZIP64 advisory](https://github.com/advisories/GHSA-px8p-9vwx-vf98). The source archive is still hash-checked before unpacking. A scoped override pins the Solidity compiler's `tmp` dependency to 0.2.7 for its [path traversal](https://github.com/advisories/GHSA-ph9p-34f9-6g65) and [type-confusion fixes](https://github.com/advisories/GHSA-7c78-jf6q-g5cm), while retaining Solidity 0.8.28 and the existing registry bytecode. CI audits dependencies at moderate severity and above. An audit reports known dependency advisories; it is not a complete security certification.

The full-snapshot unit test builds a set of assigned sources once instead of repeatedly searching all records while choosing the same 20 sample sources. Its evidence-selection assertions and timeout are unchanged.

The final presentation pass adds acceptance checks for a home page with one primary action and fewer than 100 visible main-content words, keeping catalogue/batch controls off that page, keyboard-operated secondary navigation, direct-link reloads, automatic verification after file import, and preventing a stale finding when the statement changes during archive loading. Detailed diagnostics and context remain accessible through labelled disclosures. The initial presentation suite had 14 stories. The working-review update expands it to 18 stories, adding saved-state tampering rejection, a user-entered statement through reload/inline validation/completion/export/replay, preservation of earlier drafts while starting a different case, and containment of horizontal table scrolling at a 320-pixel viewport.

All 18 browser stories passed against the public working-review deployment with the enforced content security policy, including actual local inference, preserved user-entered statements/references and decision drafts after reload, rejection of a modified saved packet, reopening completed reviews and the 320-pixel layout regression. The earlier 14-story suite also passed on the previous public deployment. A targeted story forces the derived catalogue to fail while changing a statement during archive loading: a subsequent valid source review still works from the trusted original CSV, and no stale finding appears. A browser-to-contract lifecycle was also rerun against the production preview and passed actual local EVM publication, reviewer authorization, acknowledgement, subsequent revision and withdrawal.

Two timeline rendering regressions additionally check that a missing rate is displayed on a labelled unquantified rail rather than as zero, while an explicitly reported zero remains a recorded quantified observation. The full unit suite now contains 62 tests: 54 evidence/packet tests (including optional reference integrity), three timeline rendering checks, three lossless-transport regressions and two draft-storage checks.

A subsequent narrow-screen check verified all five working routes at 320 pixels. The source table scrolls inside its container; its hidden action-column label no longer extends the outer page. The current browser suite contains 18 stories.

The provider ZIP stores its CSV members without deflate compression. The browser now downloads a pinned 2,816,026-byte gzip envelope that restores the exact 10,763,023-byte original archive. Its envelope hash is checked before decompression, followed by the original archive SHA-256. Both all-source browsing and verification still use every original CSV record. A production diagnostic took 52.8 seconds to download the original ZIP on one connection; this is a network observation, not a general latency benchmark.

The observatory update passed ten browser stories locally: original review/export/replay, mobile bounded result, real semantic inference, preserving accepted keyword provenance when model downloads are blocked, exporting a correctly sized PNG result card, opening a second country's source with separate revisions, actual guided omission replay, all-source CSV export, immediate keyword confirmation during cold model loading, and mobile/reduced-motion operation. `npm run test:e2e` reproduces these checks.

Full-catalogue batch: 4,211 sources evaluated for 2026-05-01 included to 2026-06-02 excluded; 334 have matching detection records and 3,877 do not. `npm run evaluate:batch` verifies catalogue counts against the original archive and retains all rows in `evaluation/results/batch.json`. These are hypothetical interval checks, not claims made by operators.

The browser timing row below records the earlier semantic-only UI benchmark. The current UI offers immediate keyword suggestions during semantic loading; that earlier cold delay is not a required wait before a user can run a review.

| Check                                  | Observed result                                                                                                   | Reproduce                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Evidence and packet suite              | 54 passing tests                                                                                                  | `npm test`                                            |
| Solidity roles and revision invariants | 19 passing tests on local EVM                                                                                     | `npm run contracts:test`                              |
| Full source selection                  | Three detections for AZE_S_010 in 2026-05-01 inclusive to 2026-06-02 exclusive                                    | `npm run samples` then CLI verify                     |
| Omit a record and rehash               | Self-integrity matches; full-snapshot inclusion fails                                                             | `npm test` or verifier attack button                  |
| Guidance retrieval holdout             | Hybrid top-1 16/18; BM25 top-1 14/18; hybrid top-3 18/18                                                          | `npm run evaluate`                                    |
| Local Node query inference             | p50 22.4 ms, p95 66.3 ms across 60 queries                                                                        | `evaluation/results/retrieval.json`                   |
| Browser local assistance               | Cold UI 29.34 s; warm UI p50 414 ms, p95 562 ms across 20 runs                                                    | `npm run benchmark:browser` with local server running |
| Browser page errors during benchmark   | Zero observed                                                                                                     | `evaluation/results/browser.json`                     |
| Registry lifecycle                     | Actual local EVM receipts verified for publication, reviewer acknowledgement, revision replacement and withdrawal | `npm run ledger:walkthrough` after local deployment   |

Retrieval corpus: ten authored, cited guidance cards. Query set: 60 authored queries across ten scenario groups. Seven groups (42 queries) form development; three complete groups (18 queries) form holdout. No model weights or score thresholds were tuned. The small author-labelled test is not evidence of general population performance. Some development queries are better served by semantic ranking than hybrid ranking; all engine results are retained.

Measured device: Intel Celeron N4500, Windows x64, approximately 12.7 GB physical memory, Node 24.18.1. Browser: Chrome 155, two reported logical threads, WASM using one thread. Browser UI timings include Playwright polling and rendering; the report separately retains rounded inference durations. The cold measurement includes model and runtime loading and embedding the reference notes. Results depend on device, browser cache and other system activity.

Prepared model files total 23,685,172 bytes. The WASM runtime is an additional 26,861,777-byte file plus its 53,057-byte module. These are uncompressed artifact sizes, not measured network transfer or total browser memory. Model inference stays in the browser; the core evidence check does not require the model to load.

The local ledger report uses two disposable test accounts controlled by the demonstration. It is not a public Sepolia deployment, a durable public anchor, an independent reviewer pilot or proof of emissions mitigation. The verifier checks compiled bytecode, deployment salt, successful receipt, matching event, owner, digest, predecessor and state at one observed block.

The CLI uses exit code 0 for verified integrity and source replay (with a matching anchor if one is attached), 1 for mismatch, 2 for input/runtime errors and 3 when required verification is not established. An unpublished review may pass integrity and source replay while correctly reporting no external commitment.

No emissions reductions, user adoption, investigation-time savings or repair success rates are claimed.
