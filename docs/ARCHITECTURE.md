# Architecture

The main entry now opens a world source explorer. Dedicated React views separate the explorer, proof tour, review desk, packet checks, scientific method, timeline, map and recorded ledger evidence. Browser routes are `/`, `/proof`, `/review`, `/verify` and `/method`; explicit Vercel rewrites retain deep links.

The catalogue is generated from the original hash-checked source CSV. An additional data worker loads and verifies the original ZIP, indexes source-assigned records, returns any selected source's raw records and evaluates all-source intervals. It remains separate from the local embedding worker. UI metadata never substitutes for full packet replay against the trusted archive.

Map geometry is local public-domain Natural Earth land data. Canvas keeps all 4,211 source markers lightweight; searchable controls provide a keyboard alternative. No external map API, tiles or key are needed. The proof tour uses actual verifier results and exports the original and edited packets, without publishing a chain transaction automatically.

```mermaid
flowchart LR
  A[UNEP public ZIP] --> B[Pinned static snapshot]
  B --> C[Exact source and date selection]
  D[Claim + confirmed type] --> C
  E[Local sentence embeddings] --> F[Cited guidance + type suggestion]
  F --> D
  C --> G[Deterministic evidence finding]
  G --> H[Human response]
  H --> I[Canonical review packet]
  I --> J[Browser verifier]
  I --> K[Separate CLI verifier]
  B --> J
  B --> K
  I --> L[Optional EVM revision registry]
  L --> J
  L --> K
```

The app is static Vite, React and TypeScript. Vercel hosts built files; no server database, login, paid model API or relayer is required. The small seeded case loads first; full-source verification loads the original ZIP on demand. Local history is schema-validated and versioned in browser storage.

Transformers.js runs an Apache-2.0 MiniLM embedding model in a web worker using WASM. Model and runtime loading are separate from core review. An unavailable model uses explicitly labelled keyword retrieval. Human confirmation precedes any type change. Model inference cannot decide a finding.

The Solidity registry contains no funds, tokens, upgradeable proxy or payable operations. Owner addresses publish sequential revisions with the exact predecessor digest. Explicitly authorized, distinct reviewer addresses may acknowledge only a current active revision. Withdrawal is terminal. Deployment salt, chain ID and contract address prevent accidental reuse across reset local chains.

Public data fixtures retain UNEP attribution and noncommercial terms. Code and model have separate licenses. All source records and human narrative stay off-chain; only case identity, digests, role authorization and state transitions are recorded.
