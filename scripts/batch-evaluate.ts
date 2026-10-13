import { readFile, writeFile } from "node:fs/promises";
import {
  evaluateClaim,
  readKnownSnapshot,
  type PlumeRecord,
} from "../packages/core/index.ts";
const { records, sourceIds } = await readKnownSnapshot(
  new Uint8Array(
    await readFile(
      new URL("../apps/web/public/data/mars-snapshot.zip", import.meta.url),
    ),
  ),
);
const grouped = new Map<string, PlumeRecord[]>();
for (const r of records) {
  const group = grouped.get(r.sourceId) ?? [];
  group.push(r);
  grouped.set(r.sourceId, group);
}
const index = JSON.parse(
  await readFile(
    new URL("../apps/web/public/data/source-index.json", import.meta.url),
    "utf8",
  ),
);
if (
  index.sources.length !== sourceIds.size ||
  index.sources.some(
    (s: { id: string; count: number }) =>
      !sourceIds.has(s.id) || s.count !== (grouped.get(s.id)?.length ?? 0),
  )
)
  throw new Error(
    "Derived explorer index differs from the pinned source archive.",
  );
const start = "2026-05-01",
  end = "2026-06-02";
const results = [...sourceIds].sort().map((sourceId) => {
  const finding = evaluateClaim(
    {
      sourceId,
      start,
      end,
      kind: "no_detections",
      text: "Hypothetical interval check, not an actual operator statement.",
      hypothetical: true,
      timeBasis: "provider-calendar-date",
    },
    grouped.get(sourceId) ?? [],
  );
  return { sourceId, status: finding.status, count: finding.recordIds.length };
});
if (results.some((r) => r.status === "INVALID_INPUT"))
  throw new Error("Invalid batch result.");
const report = {
  generated: new Date().toISOString(),
  scope:
    "Every source in the pinned archive, same hypothetical no-recorded-detections interval. Not operator statements, a transparency index, user adoption or mitigation results.",
  interval: { startIncluded: start, endExcluded: end },
  sourceCount: results.length,
  sourcesWithDetections: results.filter((r) => r.count > 0).length,
  sourcesWithoutMatchingRecords: results.filter((r) => r.count === 0).length,
  indexMatchesArchive: true,
  results,
};
await writeFile(
  new URL("../evaluation/results/batch.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
