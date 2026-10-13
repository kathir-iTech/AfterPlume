# Product flow

AfterPlume helps an analyst check a bounded methane statement and preserve a review that another person can replay.

## Routes

- `/`: world map, full source catalogue, filters and an all-source interval check. The map uses a local Natural Earth outline and actual provider coordinates. Map controls support pan and zoom; the searchable table provides a keyboard-accessible alternative.
- `/proof`: an automatically running, stoppable proof tour. The original packet is verified, one matching record is removed, the finding and digest are recomputed, then the changed packet is verified. Result labels come from actual checks. Both files are downloadable.
- `/review`: editable source, claim, interval and human response. The timeline focuses on the interval by default, with date/rate axes, hover/focus details and full-history toggle. Result cards summarize actual packets; they are not verification certificates.
- `/verify`: import your packet or load a packaged example in one click. Integrity, full-source replay and external commitment remain separate.
- `/method`: detailed scientific, time, attribution and cryptographic boundaries.

The public deployment shows recorded local-contract lifecycle evidence when ledger publication is opened. It labels the chain local and resettable. A locally configured browser can still perform actual wallet-driven publication. There is no claim of a deployed public testnet contract.

## Full catalogue and batch checking

`python scripts/prepare_data.py` derives the 4,211-source catalogue from the SHA-checked original ZIP. Opening another source loads and checks that original archive in a browser worker, preserving raw source records. Unassigned plumes are never assigned by map proximity. Browsing metadata does not replace the full source check.

Batch mode applies an explicitly hypothetical no-recorded-detections interval check to all sources. It does not synthesize real operator statements or rank countries by dishonesty. Results can be exported as CSV and each source can be opened at the evaluated interval. Dates shown beside results are the evaluated dates, even if the input fields are subsequently edited.

`npm run evaluate:batch` independently reproduces the interval distribution using the shared fixed policy and verifies that catalogue counts match the original archive. The generated report retains all source results. No-matching-record results cannot establish zero emissions.

Completed review history and ledger predecessor lookup are scoped to the source. A different source starts its own local revision chain rather than inheriting another source's predecessor.

## Immediate assistance

An instant keyword type suggestion and guidance ranking let the human proceed during first-use model loading. The keyword type helper uses explicit text patterns; the existing BM25 measurement evaluates guidance retrieval, not this type classifier. Do not attribute 14/18 guidance accuracy to claim-type suggestions.

Semantic suggestions still use actual MiniLM inference, never a hosted API. A background result does not silently change a type the human has already confirmed. The exported packet records the assistance actually accepted; the evidence policy remains independent of it.

## Map provenance

Natural Earth 1:110m land geometry is public domain: https://www.naturalearthdata.com/about/terms-of-use/ . The build's local path data comes from the exact upstream revision and raw SHA-256 recorded in `apps/web/public/data/world-land.json`; `python scripts/prepare-world.py` reproduces it. No API key, external map tiles or runtime map service are required.

## Claims that remain outside the implementation

No cryptographic proof of real-world absence, provider digital signature, public EAS attestation, durable IPFS pin, multi-snapshot monitoring, independent reviewer pilot or physical mitigation certification is claimed. Current exported packets establish bounded evidence replay against one explicitly identified original snapshot.
