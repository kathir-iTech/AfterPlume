import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  createPacket,
  digestPayload,
  type Claim,
  type Packet,
  type PlumeRecord,
  type SnapshotManifest,
} from "../packages/core/index.ts";
import {
  publishPacket,
  ledgerAction,
  verifyAnchor,
  type LedgerConfig,
} from "../packages/core/ledger.ts";
import type { EIP1193Provider } from "viem";
const config = JSON.parse(
  await readFile(
    new URL("../apps/web/public/ledger/local.json", import.meta.url),
    "utf8",
  ),
) as LedgerConfig;
assert.equal(
  config.chainId,
  31337,
  "This walkthrough uses only the disposable local chain.",
);
assert.equal(config.rpcUrl, "http://127.0.0.1:8545");
let actor = 0;
let requestId = 0;
const trace: { operation: string; result: string }[] = [];
const provider: EIP1193Provider = {
  on:()=>{},
  removeListener:()=>{},
  request: async ({ method, params }) => {
    const call = async (m: string, p: unknown) => {
      const response = await fetch(config.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: ++requestId,
          method: m,
          params: p ?? [],
        }),
      });
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);
      return json.result;
    };
    if (method === "eth_requestAccounts" || method === "eth_accounts") {
      const accounts = await call("eth_accounts", []);
      return [accounts[actor]];
    }
    return call(method, params);
  },
};
const fixture = JSON.parse(
  await readFile(
    new URL("../apps/web/public/data/case.json", import.meta.url),
    "utf8",
  ),
) as { manifest: SnapshotManifest; records: PlumeRecord[] };
const claim: Claim = {
  text: "Hypothetical example: no detections in the interval.",
  kind: "no_detections",
  sourceId: "AZE_S_010",
  start: "2026-05-01",
  end: "2026-06-02",
  hypothetical: true,
  timeBasis: "provider-calendar-date",
};
const first = await createPacket(
  {
    revision: 1,
    previousDigest: null,
    created: new Date().toISOString(),
    claim,
    snapshot: fixture.manifest,
    response: {
      action: "correct",
      explanation:
        "Example reviewer response: three detections are present; field follow-up is needed.",
      revisedText:
        "Three detection records exist. Physical mitigation remains unassessed.",
    },
    assistance: {
      engine: "none",
      model: "",
      modelRevision: "",
      suggestedKind: null,
      confirmedByHuman: true,
      guidanceIds: [],
    },
  },
  fixture.records,
);
const progress = (message: string) =>
  trace.push({ operation: "publication-progress", result: message });
first.receipt = await publishPacket(first, config, provider, null, progress);
assert.equal((await verifyAnchor(first, config.rpcUrl)).status, "MATCH");
trace.push({
  operation: "first-revision",
  result:
    "Successful receipt, bytecode, domain, event, owner and digest verified.",
});
const accounts = await fetch(config.rpcUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: ++requestId,
    method: "eth_accounts",
    params: [],
  }),
}).then((r) => r.json());
await ledgerAction(
  first,
  config,
  provider,
  "authorize",
  accounts.result[1],
  progress,
);
actor = 1;
await ledgerAction(
  first,
  config,
  provider,
  "acknowledge",
  "Example acknowledgement: reviewed this exact packet and its stated limits.",
  progress,
);
const acknowledged = await verifyAnchor(first, config.rpcUrl);
assert.match(acknowledged.detail, /Current revision acknowledged/);
trace.push({
  operation: "reviewer-acknowledgement",
  result: acknowledged.detail,
});
actor = 0;
const payload = {
  ...first.payload,
  revision: 2,
  previousDigest: first.digest,
  created: new Date().toISOString(),
  response: {
    ...first.payload.response,
    explanation:
      "Second hypothetical review revision: additional explanation without erasing the original evidence.",
  },
};
const second: Packet = {
  ...first,
  payload,
  digest: await digestPayload(payload),
  receipt: null,
};
second.receipt = await publishPacket(
  second,
  config,
  provider,
  first.receipt,
  progress,
);
const current = await verifyAnchor(second, config.rpcUrl);
assert.equal(current.status, "MATCH");
assert.match(current.detail, /No current acknowledgement/);
trace.push({ operation: "second-revision", result: current.detail });
const old = await verifyAnchor(first, config.rpcUrl);
assert.match(old.detail, /superseded/);
trace.push({ operation: "old-packet", result: old.detail });
const edited = structuredClone(first);
edited.payload.records = edited.payload.records.slice(1);
edited.digest = await digestPayload(edited.payload);
assert.equal((await verifyAnchor(edited, config.rpcUrl)).status, "MISMATCH");
trace.push({
  operation: "rehash-against-existing-commitment",
  result:
    "MISMATCH: edited payload differs from the original external commitment.",
});
await ledgerAction(second, config, provider, "withdraw", "", progress);
const withdrawn = await verifyAnchor(second, config.rpcUrl);
assert.match(withdrawn.detail, /withdrawn/);
trace.push({ operation: "terminal-withdrawal", result: withdrawn.detail });
await mkdir(new URL("../evaluation/results/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../evaluation/results/ledger.json", import.meta.url),
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      scope:
        "Actual Solidity bytecode and transactions on disposable Hardhat local EVM, chain 31337. Owner and reviewer are two test accounts controlled by this demonstration. No public testnet or independent-user adoption claimed.",
      config,
      receipts: [first.receipt, second.receipt],
      trace,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    {
      checks: trace.length,
      firstReceipt: first.receipt,
      secondReceipt: second.receipt,
      final: withdrawn,
    },
    null,
    2,
  ),
);
