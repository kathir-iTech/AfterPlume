import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import {
  canonical,
  createPacket,
  digestPayload,
  evaluateClaim,
  parsePacket,
  readKnownSnapshot,
  selectRecords,
  sha256,
  strictJson,
  validDate,
  type Claim,
  type Packet,
  type PlumeRecord,
  type SnapshotManifest,
} from "../packages/core/index.ts";
import { verifyPacket } from "../packages/verifier/index.ts";
const fixture = JSON.parse(
  await readFile(
    new URL("../apps/web/public/data/case.json", import.meta.url),
    "utf8",
  ),
) as { manifest: SnapshotManifest; records: PlumeRecord[] };
const claim: Claim = {
  text: "Hypothetical: no recorded detections.",
  kind: "no_detections",
  sourceId: "AZE_S_010",
  start: "2026-05-01",
  end: "2026-06-02",
  hypothetical: true,
  timeBasis: "provider-calendar-date",
};
let packet: Packet;
let zip: Uint8Array;
let snapshot: Awaited<ReturnType<typeof readKnownSnapshot>>;
beforeAll(async () => {
  zip = await readFile(
    new URL("../apps/web/public/data/mars-snapshot.zip", import.meta.url),
  );
  snapshot = await readKnownSnapshot(zip);
  packet = await createPacket(
    {
      revision: 1,
      previousDigest: null,
      created: "2026-10-12T12:00:00Z",
      claim,
      snapshot: fixture.manifest,
      response: {
        action: "correct",
        explanation: "Detection records require a narrower statement.",
        revisedText: "Mitigation remains unassessed.",
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
    snapshot.records,
  );
});
describe("provider calendar dates", () => {
  it("a statement reference travels in the hashed packet without claiming authentication", async () => {
    const payload = {
      ...packet.payload,
      claim: {
        ...packet.payload.claim,
        hypothetical: false,
        reference: "A user-supplied document, page 7",
      },
    };
    const withReference = {
      ...packet,
      payload,
      digest: await digestPayload(payload),
    };
    expect(
      parsePacket(JSON.stringify(withReference)).payload.claim.reference,
    ).toBe(payload.claim.reference);
    const checked = await verifyPacket(withReference, zip);
    expect(checked.integrity.status).toBe("MATCH");
    expect(checked.snapshot.status).toBe("MATCH");
    const altered = {
      ...withReference,
      payload: {
        ...payload,
        claim: { ...payload.claim, reference: "Changed after export" },
      },
    };
    expect((await verifyPacket(altered)).integrity.status).toBe("MISMATCH");
  });
  it.each([
    ["2024-02-29", true],
    ["2025-02-29", false],
    ["2026-02-30", false],
    ["2026-13-01", false],
    ["2026-00-10", false],
    ["2026-06-01", true],
    ["2026-6-1", false],
    ["invalid", false],
    ["2026-06-01T00:00:00Z", false],
  ])("%s validity is %s", (date, expected) =>
    expect(validDate(date)).toBe(expected),
  );
  it("includes start date", () =>
    expect(
      selectRecords({ ...claim, start: "2026-06-01" }, fixture.records),
    ).toHaveLength(1));
  it("excludes end date", () =>
    expect(
      selectRecords(
        { ...claim, start: "2026-05-29", end: "2026-06-01" },
        fixture.records,
      ),
    ).toHaveLength(0));
  it("does not reinterpret the timestamp in a local timezone", () =>
    expect(
      selectRecords({ ...claim, start: "2026-06-01" }, fixture.records)[0]
        .acquired,
    ).toBe("2026-06-01T07:59:51"));
});
describe("scientific scope", () => {
  it("finds all three source detections in the example interval", () => {
    const result = evaluateClaim(claim, fixture.records);
    expect(result.status).toBe("DETECTION_RECORDED");
    expect(result.recordIds).toHaveLength(3);
    expect(result.mitigation).toBe("NOT_ASSESSED");
  });
  it("keeps a missing quantified rate as a detection", () => {
    const r = { ...fixture.records[8], rate: "", std: "" };
    expect(evaluateClaim(claim, [r]).status).toBe("DETECTION_RECORDED");
  });
  it("does not filter by satellite", () => {
    const r = { ...fixture.records[8], satellite: "Different instrument" };
    expect(evaluateClaim(claim, [r]).status).toBe("DETECTION_RECORDED");
  });
  it("never assigns a nearby unassigned source", () => {
    const r = { ...fixture.records[8], sourceId: "" };
    expect(evaluateClaim(claim, [r]).status).toBe(
      "NO_MATCHING_DETECTIONS_IN_SNAPSHOT",
    );
  });
  it("does not confuse source identifiers or countries", () =>
    expect(
      evaluateClaim({ ...claim, sourceId: "AUS_S_010" }, fixture.records)
        .recordIds,
    ).toHaveLength(0));
  it("positive observation does not disprove that a repair occurred", () => {
    const finding = evaluateClaim(
      { ...claim, kind: "repair_occurred" },
      fixture.records,
    );
    expect(finding.status).toBe("INSUFFICIENT_OR_INCOMPATIBLE");
    expect(finding.reason).toContain("do not establish whether");
  });
  it("empty interval does not verify repair", () =>
    expect(
      evaluateClaim(
        {
          ...claim,
          kind: "repair_occurred",
          start: "2026-07-01",
          end: "2026-08-01",
        },
        fixture.records,
      ).status,
    ).toBe("INSUFFICIENT_OR_INCOMPATIBLE"));
  it("zero emissions stays unsupported with positive records", () =>
    expect(
      evaluateClaim({ ...claim, kind: "zero_emissions" }, fixture.records)
        .status,
    ).toBe("INSUFFICIENT_OR_INCOMPATIBLE"));
  it("zero emissions stays unsupported without records", () =>
    expect(evaluateClaim({ ...claim, kind: "zero_emissions" }, []).status).toBe(
      "INSUFFICIENT_OR_INCOMPATIBLE",
    ));
  it("does not compute a reduction percentage from two rates", () =>
    expect(
      evaluateClaim({ ...claim, kind: "reduction_percent" }, fixture.records)
        .status,
    ).toBe("INSUFFICIENT_OR_INCOMPATIBLE"));
  it("empty detection interval preserves coverage limitations", () => {
    const result = evaluateClaim(
      { ...claim, start: "2026-07-01", end: "2026-08-01" },
      fixture.records,
    );
    expect(result.status).toBe("NO_MATCHING_DETECTIONS_IN_SNAPSHOT");
    expect(result.coverage).toBe("INSUFFICIENT_FOR_CESSATION");
  });
  it.each([
    { start: "2026-06-02", end: "2026-05-01" },
    { start: "2026-06-01", end: "2026-06-01" },
    { start: "2026-02-30", end: "2026-06-01" },
  ])("rejects invalid interval %j", (interval) =>
    expect(
      evaluateClaim({ ...claim, ...interval }, fixture.records).status,
    ).toBe("INVALID_INPUT"),
  );
  it("rejects an unknown provider source", () =>
    expect(evaluateClaim(claim, fixture.records, false).status).toBe(
      "INVALID_INPUT",
    ));
  it("sorts selection consistently when input order changes", () =>
    expect(selectRecords(claim, [...fixture.records].reverse())).toEqual(
      selectRecords(claim, fixture.records),
    ));
  it("scans the full snapshot without excluding missing rate records", () => {
    // Preserve the same sampled sources without scanning 30,319 rows for each catalogue entry.
    const assignedSources = new Set(snapshot.records.map((r) => r.sourceId));
    const sources = [...snapshot.sourceIds]
      .filter((id) => assignedSources.has(id))
      .slice(0, 20);
    for (const id of sources) {
      const bounded = {
        ...claim,
        sourceId: id,
        start: "2020-01-01",
        end: "2027-01-01",
      };
      expect(selectRecords(bounded, snapshot.records).length).toBe(
        snapshot.records.filter((r) => r.sourceId === id).length,
      );
    }
  });
});
describe("canonical packet and source replay", () => {
  it("matches SHA-256 known vector", async () =>
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    ));
  it("canonicalizes RFC 8785 sample serialization", () =>
    expect(
      canonical({
        numbers: [
          333333333.33333329, 1e30, 4.5, 2e-3, 0.000000000000000000000000001,
        ],
        string: '€$\u000f\nA\'B"\\"/',
        literals: [null, true, false],
      }),
    ).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\\u000f\\nA\'B\\"\\\\\\"/"}',
    ));
  it("canonical digest ignores object insertion order", async () =>
    expect(await digestPayload({ b: 2, a: 1 })).toBe(
      await digestPayload({ a: 1, b: 2 }),
    ));
  it("replays a valid packet against all source rows", async () => {
    const r = await verifyPacket(packet, zip);
    expect(r.integrity.status).toBe("MATCH");
    expect(r.snapshot.status).toBe("MATCH");
    expect(r.anchor.status).toBe("NOT_ESTABLISHED");
  });
  it("does not claim completeness without the full source ZIP", async () =>
    expect((await verifyPacket(packet)).snapshot.status).toBe(
      "NOT_ESTABLISHED",
    ));
  it("does not unpack a file whose trusted hash differs", async () =>
    await expect(readKnownSnapshot(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "No archive was unpacked",
    ));
  it.each(["claim", "source", "rate", "response", "policy"] as const)(
    "detects mutation of %s without rehash",
    async (field) => {
      const p = structuredClone(packet);
      if (field === "claim") p.payload.claim.text += " changed";
      if (field === "source") p.payload.claim.sourceId = "OTHER";
      if (field === "rate") p.payload.records[0].rate = "0";
      if (field === "response")
        p.payload.response.explanation = "Changed response";
      if (field === "policy") p.payload.policy.sha256 = "0".repeat(64);
      expect((await verifyPacket(p)).integrity.status).toBe("MISMATCH");
    },
  );
  it("detects an omitted row even if author recomputes finding and hash", async () => {
    const p = structuredClone(packet);
    p.payload.records = p.payload.records.slice(1);
    p.payload.finding = evaluateClaim(p.payload.claim, p.payload.records);
    p.digest = await digestPayload(p.payload);
    const r = await verifyPacket(p, zip);
    expect(r.integrity.status).toBe("MATCH");
    expect(r.snapshot.status).toBe("MISMATCH");
  });
  it("detects fabricated raw rate despite a freshly valid self hash", async () => {
    const p = structuredClone(packet);
    p.payload.records[0].raw.ch4_fluxrate = "0";
    p.payload.records[0].rate = "0";
    p.digest = await digestPayload(p.payload);
    expect((await verifyPacket(p, zip)).snapshot.status).toBe("MISMATCH");
  });
  it("human correction preserves original text and conflicting observation", () => {
    expect(packet.payload.claim.text).toContain("no recorded");
    expect(packet.payload.records).toHaveLength(3);
    expect(packet.payload.response.action).toBe("correct");
  });
  it("does not hash appended receipt metadata into the payload", async () =>
    expect(await digestPayload({ ...packet, receipt: null }.payload)).toBe(
      packet.digest,
    ));
  it.each([
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"n":1e999}',
    '{"a":1} trailing',
    "[1,]",
    '{"a":undefined}',
  ])("rejects ambiguous or invalid JSON %s", (s) =>
    expect(() => strictJson(s)).toThrow(),
  );
  it("rejects unexpected schema fields", () =>
    expect(() =>
      parsePacket(JSON.stringify({ ...packet, secret: "ignored?" })),
    ).toThrow());
  it("rejects precise timestamps as date boundaries", () => {
    const p = structuredClone(packet);
    p.payload.claim.start = "2026-05-01T00:00:00Z";
    expect(() => parsePacket(JSON.stringify(p))).toThrow();
  });
  it("does not turn ISO strings into numeric quantities", () =>
    expect(typeof packet.payload.records[0].rate).toBe("string"));
});
