import { readFile, writeFile, mkdir } from "node:fs/promises";
import { cpus, totalmem, platform, arch } from "node:os";
import { fileURLToPath } from "node:url";
import { env, pipeline } from "@huggingface/transformers";
import {
  cards,
  lexicalRank,
  cosine,
  hybridRank,
} from "../packages/retrieval/index.ts";
import { MODEL, sha256 } from "../packages/core/index.ts";
env.allowRemoteModels = false;
env.localModelPath = fileURLToPath(
  new URL("../apps/web/public/models/", import.meta.url),
);
type Group = {
  group: string;
  split: string;
  expected: string;
  queries: string[];
};
const queryBytes = await readFile(
  new URL("../evaluation/queries.json", import.meta.url),
);
const groups = JSON.parse(queryBytes.toString()) as Group[];
const started = performance.now();
const extractor = await pipeline("feature-extraction", MODEL.id, {
  device: "cpu",
  dtype: "q8",
});
const coldLoadMs = performance.now() - started;
const vectors = (
  await extractor(
    cards.map((c) => c.title + " " + c.text),
    { pooling: "mean", normalize: true },
  )
).tolist() as number[][];
const observations: {
  group: string;
  split: string;
  query: string;
  expected: string;
  milliseconds: number;
  ranked: Record<"bm25" | "semantic" | "hybrid", string[]>;
}[] = [];
for (const group of groups)
  for (const query of group.queries) {
    const start = performance.now();
    const vector = (
      (
        await extractor(query, { pooling: "mean", normalize: true })
      ).tolist() as number[][]
    )[0];
    const ms = performance.now() - start;
    const semantic = cards
      .map((c, i) => ({ id: c.id, score: cosine(vector, vectors[i]) }))
      .sort((a, b) => b.score - a.score);
    const ranked = {
      bm25: lexicalRank(query).map((c) => c.id),
      semantic: semantic.map((c) => c.id),
      hybrid: hybridRank(query, vector, vectors).map((c) => c.id),
    };
    observations.push({
      group: group.group,
      split: group.split,
      query,
      expected: group.expected,
      milliseconds: ms,
      ranked,
    });
  }
const summarize = (split: string) => {
  const rows = observations.filter((r) => r.split === split);
  return Object.fromEntries(
    (["bm25", "semantic", "hybrid"] as const).map((engine) => [
      engine,
      {
        count: rows.length,
        hitAt1:
          rows.filter((r) => r.ranked[engine][0] === r.expected).length /
          rows.length,
        hitAt3:
          rows.filter((r) => r.ranked[engine].slice(0, 3).includes(r.expected))
            .length / rows.length,
        mrr:
          rows.reduce(
            (s, r) => s + 1 / (r.ranked[engine].indexOf(r.expected) + 1),
            0,
          ) / rows.length,
      },
    ]),
  );
};
const times = observations.map((o) => o.milliseconds).sort((a, b) => a - b);
const modelManifest = JSON.parse(
  await readFile(
    new URL("../apps/web/public/models/manifest.json", import.meta.url),
    "utf8",
  ),
);
const report = {
  generated: new Date().toISOString(),
  model: MODEL,
  queryFileSha256: await sha256(queryBytes),
  method:
    "60 authored queries in 10 scenario groups; 7 development groups and 3 group-separated holdout groups. No user study or scientific classification accuracy claim. No weights were tuned.",
  device: {
    cpu: cpus()[0]?.model,
    memoryBytes: totalmem(),
    platform: platform(),
    arch: arch(),
    node: process.version,
  },
  runtime: "Node CPU ONNX runtime; browser timings are measured separately",
  coldLoadMs,
  queryLatency: {
    count: times.length,
    p50: times[Math.ceil(times.length * 0.5) - 1],
    p95: times[Math.ceil(times.length * 0.95) - 1],
  },
  downloadedModelBytes: modelManifest.files.reduce(
    (s: number, f: { bytes: number }) => s + f.bytes,
    0,
  ),
  development: summarize("development"),
  holdout: summarize("holdout"),
  observations,
};
await mkdir(new URL("../evaluation/results/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../evaluation/results/retrieval.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, observations: undefined }, null, 2));
await extractor.dispose();
