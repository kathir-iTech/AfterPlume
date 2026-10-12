import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  createPacket,
  digestPayload,
  evaluateClaim,
  type Claim,
} from "../packages/core/index.ts";
const fixture = JSON.parse(
  await readFile(
    new URL("../apps/web/public/data/case.json", import.meta.url),
    "utf8",
  ),
);
const claim: Claim = {
  text: "Hypothetical: no methane detections recorded for AZE_S_010 in this interval.",
  kind: "no_detections",
  sourceId: "AZE_S_010",
  start: "2026-05-01",
  end: "2026-06-02",
  hypothetical: true,
  timeBasis: "provider-calendar-date",
};
const packet = await createPacket(
  {
    revision: 1,
    previousDigest: null,
    created: "2026-10-12T12:00:00Z",
    claim,
    snapshot: fixture.manifest,
    response: {
      action: "correct",
      explanation:
        "Example response: three matching detections are recorded. Field follow-up is needed to establish mitigation.",
      revisedText:
        "Three detections are present in the pinned snapshot. Mitigation is unassessed.",
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
const edited = structuredClone(packet);
edited.payload.records = edited.payload.records.slice(0, -1);
edited.payload.finding = evaluateClaim(
  edited.payload.claim,
  edited.payload.records,
);
edited.digest = await digestPayload(edited.payload);
await mkdir(new URL("../public-data/examples/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../public-data/examples/valid-review.json", import.meta.url),
  JSON.stringify(packet, null, 2),
);
await writeFile(
  new URL("../public-data/examples/omitted-and-rehashed.json", import.meta.url),
  JSON.stringify(edited, null, 2),
);
console.log(
  "Reproducible hypothetical review and omission example generated from actual source rows.",
);
