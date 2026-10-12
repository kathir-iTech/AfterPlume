# Working walkthrough

Start with the distinction: a satellite observation is evidence of a detection; a claim that a repair happened or emissions stopped needs other evidence.

1. **Open the real source.** AZE_S_010, UNEP IMEO MARS. The statement is labelled hypothetical. Show the source, snapshot and calendar interval.
2. **Use local assistance.** The model suggests the bounded claim type and retrieves cited reference notes. Confirm the type as a human. First use loads model/runtime assets; a cached demo must not be described as cold performance.
3. **Run the evidence check.** Three records fall within the interval, including the 1 June 2026 EMIT record, 601 kg/h with reported standard deviation 155 kg/h. This conflicts with “no recorded detections.” It does not establish whether a repair occurred or whether emissions subsequently stopped.
4. **Respond.** Correct or narrow the statement. The original claim remains visible. Review status becomes completed while mitigation stays unassessed.
5. **Export and replay.** The verifier recomputes the canonical payload and compares every matching record with the full pinned source ZIP.
6. **Try the omission attack.** Remove a matching record and recompute the finding and hash. Self-integrity can still match; source inclusion fails. Explain why a hash alone is insufficient.
7. **Optional registry path.** On the configured local EVM, publish the digest, authorize a distinct test reviewer, acknowledge revision 1, publish revision 2 and observe that revision 1's acknowledgement is historical. Withdraw the case. Label this local, resettable execution; do not call it a public testnet deployment or independent-user review.

One defensible measured result is 16/18 expected guidance notes ranked first in the scenario-separated retrieval holdout, compared with 14/18 for keyword search. This measures retrieval only. Keep the dataset and hardware limits visible when showing performance results.

Architecture beat: browser worker for local embeddings, fixed evidence rules, canonical portable packet, separate CLI replay and an optional nonfinancial revision registry. The purpose is reproducible review, not scientific certification by blockchain.

Screenshots in `docs/screenshots/` were captured from the working application. Source data, sample packets, reports and reproduction commands are in this repository.
