# AfterPlume

A report can hide a plume. Replay catches it.

## What it does

AfterPlume helps climate journalists check methane statements and preserve the evidence behind their editorial decisions. The main path is: find a source, enter your statement, inspect the observations, record your decision, then export and verify the review. Explore provides an interactive world map and a searchable catalogue of all 4,211 provider sources.

Statements start empty when a source is opened. A reviewer can add the exact wording and a document title, page or URL. Draft statements and unfinished decisions survive reloads; Your reviews reopens completed work and preserves drafts when another case is started. Browser storage is local to the device; portable JSON exports provide sharing and backup. A standalone readable report presents the statement, decision, observations and fingerprints, opens offline and can be printed to PDF. It is a reading copy; JSON remains the replayable artifact. Statement references are recorded, not independently authenticated.

The optional proof example runs the entire omission test automatically: replay the original, remove one observation, rebuild the finding and hash, then catch the omission with full-source inclusion. Both packets are downloadable, making the result inspectable. Practice claims are explicitly labelled and remain separate from the normal workflow.

Batch mode checks one explicitly hypothetical no-recorded-detections interval across every source. For 1 May 2026 included to 2 June 2026 excluded, 334 sources have matching detections and 3,877 have no matching records. These are reproducible snapshot properties, not allegations about actual operator statements or a national accountability score.

AfterPlume turns a bounded methane statement into an evidence review another person can reproduce. A reviewer selects the exact provider source, date interval and confirmed claim type. The app checks every matching observation, explains what the records establish, keeps the evidence gaps visible and preserves the original statement alongside a human correction, explanation or withdrawal.

The starting example uses nine real observations for UNEP IMEO MARS source AZE_S_010 and an explicitly hypothetical statement. Three records fall within the chosen interval, including the 1 June 2026 EMIT record. This conflicts with a statement that no detections were recorded. It does not establish whether a repair happened or whether emissions later stopped. This is a demonstration, not an allegation about an operator.

The review can be exported as a portable JSON packet. A browser verifier and separate command-line entry point recompute its canonical digest, check inclusion against the full trusted source snapshot and replay the fixed evidence policy. Optional Solidity registry integration records exact digests, sequential revisions, authorized reviewer acknowledgements and terminal withdrawal on a configured EVM network.

## Problem and inspiration

Detection, repair and sustained mitigation are different statements. Public observation data can support a precise statement about a recorded plume, while leaving field actions and observation coverage unresolved. An analyst needs to know which records, source assignment, dates, dataset version and evidence rules were used before accepting a conclusion.

Our pinned public snapshot contains 30,319 plume records and 4,211 sources. Its records do not include a complete negative-observation history. Missing rates still represent detections, and an empty interval cannot certify zero emissions. AfterPlume makes these distinctions part of the review itself.

## How it works

The static React and TypeScript app uses browser workers to load source-assigned records from the pinned original archive. Optional local MiniLM sentence embeddings suggest a claim type and rank authored, cited guidance; a human confirms the type. Immediate keyword suggestions keep evidence checking available during model loading or failure. Scientific findings follow deterministic, versioned rules and do not depend on the model.

Each exported payload includes the original claim, snapshot manifest, policy digest, complete selected raw records, finding, human response and assistance provenance. RFC 8785 canonicalization and SHA-256 provide a reproducible digest. Full-source replay checks more than that self-declared hash.

The nonfinancial ReviewRegistry contract uses owner authorization, exact predecessor digests, sequential revision numbers and a deployment-specific salt. Reviewers can acknowledge only the current active revision. An acknowledgement of revision 1 stays historical after revision 2 is published. Live receipt verification checks compiled bytecode, chain, deployment domain, successful transaction, matching event, owner, digest and observed state.

## Accomplishments

The memorable test is a selectively edited review: remove a conflicting observation, recompute the finding and rehash the file. Self-integrity still passes, while source inclusion fails against the original full ZIP. An existing ledger commitment also differs from the edited digest.

We ran 65 unit tests, 19 local EVM contract tests and 19 browser acceptance stories. The browser stories cover the live review flow, saved drafts and decisions, rejection of modified saved evidence, independent file import, model failure, omitted-record detection and layouts down to 320 pixels. The local model also executed a 60-query guidance-retrieval evaluation with scenario-separated groups. Hybrid ranking placed the expected note first for 16 of 18 authored holdout queries, compared with 14 of 18 for keyword retrieval. This measures guidance retrieval only; it is not methane detection, fraud accuracy or a user study.

The working browser flow includes claim review, human response, export, full-source replay and the omission attack. Actual local EVM transactions exercised publication, distinct reviewer authorization, acknowledgement, revision replacement and withdrawal. Local chain execution is resettable and is not presented as a durable public testnet deployment.

## What we built it with

Vite, React, TypeScript, Transformers.js, ONNX Runtime WASM, an Apache-2.0 MiniLM embedding model, Zod, RFC 8785 canonicalization, SHA-256, viem, Solidity, Hardhat, Vitest and Playwright. Public source data comes from UNEP IMEO MARS, with separate noncommercial attribution and share-alike notices. GitHub hosts the source; Vercel hosts the static application. No paid model API, server database or purchased cryptocurrency is required for the core flow.

## Limits and next steps

AfterPlume is a noncommercial research prototype. A replayed review does not establish repair success, sustained cessation, facility ownership, regulatory compliance or measured emissions reductions. The provider ZIP is pinned over HTTPS and is not digitally signed by UNEP. A reviewer address is not a certified auditor.

The next validation step is practitioner feedback on claim wording and evidence handoff, followed by responsibly versioned additional snapshots and field evidence where appropriate access and rights exist. Public testnet publication depends on a configured deployment and free test-token access. We do not claim user adoption or avoided emissions.
