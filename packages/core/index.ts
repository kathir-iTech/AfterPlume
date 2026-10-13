import { canonicalize } from "json-canonicalize";
import { z } from "zod";
import Papa from "papaparse";
import { unzipSync } from "fflate";

export const SNAPSHOT_SHA =
  "e0721015e925c4d70012ca13e697f5638421bc7c2a42f7e3dce8edec6cee8481";
export const SNAPSHOT_URL =
  "https://unepazeconomyadlsstorage.blob.core.windows.net/public/unep_methanedata_detected_plumes_csv.zip";
export const POLICY = {
  id: "afterplume-evidence-1.0.0",
  interval:
    "Provider calendar dates; start inclusive, end exclusive. No timezone conversion.",
  selection:
    "Every record with exactly matching source_name and acquisition date in the interval, irrespective of sensor or quantification.",
  noDetection:
    "No matching detections in a snapshot does not establish continuous coverage or cessation.",
  repair:
    "Post-repair detections require follow-up and do not establish whether a repair occurred.",
  rate: "Instantaneous kg/h and reported standard deviation; no annualization or percentage reduction from isolated observations.",
  mitigation:
    "Not assessed; no field evidence or negative-observation coverage in this policy.",
} as const;
export const MODEL = {
  id: "Xenova/all-MiniLM-L6-v2",
  revision: "751bff37182d3f1213fa05d7196b954e230abad9",
  dtype: "q8",
  dimensions: 384,
  license: "Apache-2.0",
} as const;
export const claimKinds = [
  "no_detections",
  "repair_occurred",
  "zero_emissions",
  "reduction_percent",
] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const ClaimSchema = z
  .object({
    text: z.string().min(1).max(3000),
    kind: z.enum(claimKinds),
    sourceId: z.string().min(1).max(80),
    start: date,
    end: date,
    hypothetical: z.boolean(),
    reference: z.string().max(1500).optional(),
    timeBasis: z.literal("provider-calendar-date"),
  })
  .strict();
export type Claim = z.infer<typeof ClaimSchema>;
export const RecordSchema = z
  .object({
    id: z.string().min(1),
    sourceId: z.string(),
    acquired: z.string(),
    satellite: z.string(),
    rate: z.string(),
    std: z.string(),
    lat: z.string(),
    lon: z.string(),
    raw: z.record(z.string(), z.string()),
  })
  .strict();
export type PlumeRecord = z.infer<typeof RecordSchema>;
export const SnapshotSchema = z
  .object({
    id: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    url: z.literal(SNAPSHOT_URL),
    captured: z.string(),
    recordCount: z.number().int().nonnegative(),
    sourceCount: z.number().int().nonnegative(),
    license: z.literal("CC BY-NC-SA 4.0 (download); CC BY-NC 4.0 (terms)"),
    coverage: z.literal(
      "Detection records only; per-overpass negative coverage unavailable",
    ),
  })
  .strict();
export type SnapshotManifest = z.infer<typeof SnapshotSchema>;
export const KNOWN_SNAPSHOT: SnapshotManifest = {
  id: "unep-mars-2026-10-12",
  sha256: SNAPSHOT_SHA,
  url: SNAPSHOT_URL,
  captured: "2026-10-12",
  recordCount: 30319,
  sourceCount: 4211,
  license: "CC BY-NC-SA 4.0 (download); CC BY-NC 4.0 (terms)",
  coverage:
    "Detection records only; per-overpass negative coverage unavailable",
};
export const FindingSchema = z
  .object({
    status: z.enum([
      "DETECTION_RECORDED",
      "NO_MATCHING_DETECTIONS_IN_SNAPSHOT",
      "INSUFFICIENT_OR_INCOMPATIBLE",
      "INVALID_INPUT",
    ]),
    reason: z.string(),
    recordIds: z.array(z.string()),
    mitigation: z.literal("NOT_ASSESSED"),
    coverage: z.literal("INSUFFICIENT_FOR_CESSATION"),
    limitations: z.array(z.string()),
  })
  .strict();
export type Finding = z.infer<typeof FindingSchema>;
export const ResponseSchema = z
  .object({
    action: z.enum(["pending", "correct", "retain", "withdraw"]),
    explanation: z.string().max(5000),
    revisedText: z.string().max(3000),
  })
  .strict();
export type HumanResponse = z.infer<typeof ResponseSchema>;
const hex32 = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
export const ReceiptSchema = z
  .object({
    chainId: z.number().int().positive(),
    contract: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    deploymentSalt: hex32,
    caseId: hex32,
    revision: z.number().int().positive(),
    txHash: hex32,
    owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    digest: hex32,
  })
  .strict();
export type LedgerReceipt = z.infer<typeof ReceiptSchema>;
export const PayloadSchema = z
  .object({
    protocol: z.literal("afterplume/1"),
    revision: z.number().int().positive(),
    previousDigest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    created: z.string(),
    claim: ClaimSchema,
    snapshot: SnapshotSchema,
    policy: z
      .object({
        id: z.literal(POLICY.id),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    records: z.array(RecordSchema).max(5000),
    finding: FindingSchema,
    response: ResponseSchema,
    assistance: z
      .object({
        engine: z.enum(["semantic-local", "lexical", "none"]),
        model: z.string(),
        modelRevision: z.string(),
        suggestedKind: z.enum(claimKinds).nullable(),
        confirmedByHuman: z.boolean(),
        guidanceIds: z.array(z.string()).max(30),
      })
      .strict(),
  })
  .strict();
export type Payload = z.infer<typeof PayloadSchema>;
export const PacketSchema = z
  .object({
    payload: PayloadSchema,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    attribution: z.literal(
      "UNEP IMEO MARS public detection data. Noncommercial, attributed, share-alike adapted data; see DATA_LICENSE.md.",
    ),
    receipt: ReceiptSchema.nullable(),
  })
  .strict();
export type Packet = z.infer<typeof PacketSchema>;
export const ATTRIBUTION =
  "UNEP IMEO MARS public detection data. Noncommercial, attributed, share-alike adapted data; see DATA_LICENSE.md." as const;
export function canonical(value: unknown): string {
  const seen = new Set<object>();
  const validate = (v: unknown): void => {
    if (typeof v === "number" && !Number.isFinite(v))
      throw new Error("Non-finite canonical number.");
    if (
      typeof v === "undefined" ||
      typeof v === "bigint" ||
      typeof v === "function" ||
      typeof v === "symbol"
    )
      throw new Error("Invalid canonical value.");
    if (typeof v === "string") {
      for (let i = 0; i < v.length; i++) {
        const c = v.charCodeAt(i);
        if (c >= 0xd800 && c <= 0xdbff) {
          const next = v.charCodeAt(++i);
          if (!(next >= 0xdc00 && next <= 0xdfff))
            throw new Error("Invalid Unicode surrogate.");
        } else if (c >= 0xdc00 && c <= 0xdfff)
          throw new Error("Invalid Unicode surrogate.");
      }
    }
    if (v && typeof v === "object") {
      if (seen.has(v)) throw new Error("Circular canonical value.");
      seen.add(v);
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) validate(v[i]);
      } else
        for (const [k, item] of Object.entries(v)) {
          validate(k);
          validate(item);
        }
      seen.delete(v);
    }
  };
  validate(value);
  return canonicalize(value);
}
export async function sha256(value: string | Uint8Array): Promise<string> {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
}
export const digestPayload = (value: unknown) => sha256(canonical(value));
export const policyDigest = () => digestPayload(POLICY);

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function selectRecords(
  claim: Claim,
  records: PlumeRecord[],
): PlumeRecord[] {
  return records
    .filter(
      (r) =>
        r.sourceId === claim.sourceId &&
        validDate(r.acquired.slice(0, 10)) &&
        r.acquired.slice(0, 10) >= claim.start &&
        r.acquired.slice(0, 10) < claim.end,
    )
    .sort((a, b) =>
      a.acquired < b.acquired
        ? -1
        : a.acquired > b.acquired
          ? 1
          : a.id < b.id
            ? -1
            : a.id > b.id
              ? 1
              : 0,
    );
}
export function evaluateClaim(
  claim: Claim,
  records: PlumeRecord[],
  knownSource = true,
): Finding {
  const limitations = [
    "This snapshot contains detection records, not a complete history of satellite overpasses.",
    "A missing rate is not a negative detection.",
    "Physical repair and sustained mitigation are not established by this review.",
  ];
  const base = {
    mitigation: "NOT_ASSESSED" as const,
    coverage: "INSUFFICIENT_FOR_CESSATION" as const,
    limitations,
  };
  if (
    !ClaimSchema.safeParse(claim).success ||
    !validDate(claim.start) ||
    !validDate(claim.end) ||
    claim.start >= claim.end ||
    !knownSource
  )
    return {
      ...base,
      status: "INVALID_INPUT",
      reason:
        "Choose a known provider source and a valid interval with the start before the exclusive end.",
      recordIds: [],
    };
  const chosen = selectRecords(claim, records);
  const recordIds = chosen.map((r) => r.id);
  if (claim.kind === "zero_emissions")
    return {
      ...base,
      status: "INSUFFICIENT_OR_INCOMPATIBLE",
      reason:
        "Detection-only records cannot verify zero emissions or sustained cessation. Negative-observation coverage and suitable field evidence are missing.",
      recordIds,
    };
  if (claim.kind === "reduction_percent")
    return {
      ...base,
      status: "INSUFFICIENT_OR_INCOMPATIBLE",
      reason:
        "A percentage reduction requires comparable baseline and follow-up measurements with uncertainty. Isolated instantaneous satellite rates cannot establish it.",
      recordIds,
    };
  if (claim.kind === "repair_occurred")
    return {
      ...base,
      status: "INSUFFICIENT_OR_INCOMPATIBLE",
      reason: chosen.length
        ? `${chosen.length} detection record${chosen.length === 1 ? "" : "s"} after the stated repair date require follow-up. They do not establish whether the repair occurred or succeeded.`
        : "No matching records were found. A repair still requires field evidence; this snapshot cannot establish it.",
      recordIds,
    };
  if (chosen.length)
    return {
      ...base,
      status: "DETECTION_RECORDED",
      reason: `${chosen.length} detection record${chosen.length === 1 ? "" : "s"} fall within the stated source and interval. The bounded statement “no recorded detections” conflicts with this snapshot.`,
      recordIds,
    };
  return {
    ...base,
    status: "NO_MATCHING_DETECTIONS_IN_SNAPSHOT",
    reason:
      "No matching detection records in this snapshot and interval. Observation coverage is unavailable; cessation is not established.",
    recordIds,
  };
}

export function normalizeRecord(raw: Record<string, string>): PlumeRecord {
  return {
    id: raw.id_plume ?? "",
    sourceId: raw.source_name ?? "",
    acquired: raw.tile_date ?? "",
    satellite: raw.satellite ?? "",
    rate: raw.ch4_fluxrate ?? "",
    std: raw.ch4_fluxrate_std ?? "",
    lat: raw.lat ?? "",
    lon: raw.lon ?? "",
    raw,
  };
}
export async function readKnownSnapshot(
  bytes: Uint8Array,
): Promise<{ records: PlumeRecord[]; sourceIds: Set<string> }> {
  if (bytes.byteLength > 20_000_000 || (await sha256(bytes)) !== SNAPSHOT_SHA)
    throw new Error(
      "The file does not match the trusted snapshot SHA-256. No archive was unpacked.",
    );
  const files = unzipSync(bytes, {
    filter: (f) =>
      f.originalSize < 30_000_000 &&
      [
        "unep_methanedata_detected_plumes.csv",
        "unep_methanedata_detected_sources.csv",
      ].includes(f.name.split("/").at(-1) ?? "") &&
      !f.name.includes("..") &&
      !f.name.startsWith("/"),
  });
  const names = Object.keys(files);
  const plumeName = names.find(
    (n) => n.split("/").at(-1) === "unep_methanedata_detected_plumes.csv",
  );
  const sourceName = names.find(
    (n) => n.split("/").at(-1) === "unep_methanedata_detected_sources.csv",
  );
  if (!plumeName || !sourceName)
    throw new Error("Required CSV members missing.");
  const parse = (name: string) => {
    const result = Papa.parse<Record<string, string>>(
      new TextDecoder().decode(files[name]),
      { header: true, skipEmptyLines: true, dynamicTyping: false },
    );
    if (result.errors.length) throw new Error("Invalid CSV snapshot.");
    return result.data;
  };
  const records = parse(plumeName).map(normalizeRecord);
  if (new Set(records.map((r) => r.id)).size !== records.length)
    throw new Error("Duplicate record identifiers.");
  return {
    records,
    sourceIds: new Set(parse(sourceName).map((r) => r.source_name)),
  };
}

export async function createPacket(
  input: Omit<Payload, "protocol" | "policy" | "finding" | "records">,
  allRecords: PlumeRecord[],
  knownSource = true,
): Promise<Packet> {
  if (!input.assistance.confirmedByHuman)
    throw new Error("Confirm the claim type before creating a review.");
  const payload: Payload = {
    ...input,
    protocol: "afterplume/1",
    policy: { id: POLICY.id, sha256: await policyDigest() },
    records: selectRecords(input.claim, allRecords),
    finding: evaluateClaim(input.claim, allRecords, knownSource),
  };
  PayloadSchema.parse(payload);
  return {
    payload,
    digest: await digestPayload(payload),
    attribution: ATTRIBUTION,
    receipt: null,
  };
}

/** Strict JSON parser: duplicate decoded keys, non-finite numbers and trailing content are rejected. */
export function strictJson(text: string): unknown {
  if (new TextEncoder().encode(text).byteLength > 12_000_000)
    throw new Error("Packet exceeds the 12 MB limit.");
  let i = 0;
  const ws = () => {
    while (/[ \t\n\r]/.test(text[i] ?? "") && i < text.length) i++;
  };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i++] === '"') return JSON.parse(text.slice(start, i)) as string;
    }
    throw new Error("Unterminated string.");
  };
  const value = (depth: number): unknown => {
    if (depth > 60) throw new Error("JSON nesting exceeds limit.");
    ws();
    if (text[i] === '"') return string();
    if (text[i] === "{") {
      i++;
      ws();
      const out: Record<string, unknown> = Object.create(null);
      const keys = new Set<string>();
      if (text[i] === "}") {
        i++;
        return out;
      }
      while (true) {
        ws();
        if (text[i] !== '"') throw new Error("Expected object key.");
        const key = string();
        if (keys.has(key)) throw new Error("Duplicate JSON key: " + key);
        keys.add(key);
        ws();
        if (text[i++] !== ":") throw new Error("Expected colon.");
        out[key] = value(depth + 1);
        ws();
        const c = text[i++];
        if (c === "}") return out;
        if (c !== ",") throw new Error("Expected comma.");
      }
    }
    if (text[i] === "[") {
      i++;
      ws();
      const out: unknown[] = [];
      if (text[i] === "]") {
        i++;
        return out;
      }
      while (true) {
        out.push(value(depth + 1));
        ws();
        const c = text[i++];
        if (c === "]") return out;
        if (c !== ",") throw new Error("Expected comma.");
      }
    }
    for (const [token, result] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (text.startsWith(token, i)) {
        i += token.length;
        return result;
      }
    }
    const match = text
      .slice(i)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) throw new Error("Invalid JSON value.");
    i += match[0].length;
    const n = Number(match[0]);
    if (!Number.isFinite(n)) throw new Error("Non-finite number.");
    return n;
  };
  const parsed = value(0);
  ws();
  if (i !== text.length) throw new Error("Trailing JSON content.");
  return parsed;
}
export function parsePacket(text: string): Packet {
  return PacketSchema.parse(strictJson(text));
}
