import type {
  Claim,
  Packet,
  PlumeRecord,
  SnapshotManifest,
} from "../../../packages/core/index.ts";
export type Fixture = {
  manifest: SnapshotManifest;
  sources: Record<string, string>[];
  records: PlumeRecord[];
};
export type Assistance = Packet["payload"]["assistance"];
export type LocalAI = {
  engine: "semantic-local";
  guidanceIds: string[];
  suggestedKind: Claim["kind"];
  milliseconds: number;
  dimensions: number;
};
export const titles: Record<Claim["kind"], string> = {
  no_detections: "No recorded detections",
  repair_occurred: "Repair occurred on a date",
  zero_emissions: "Zero emissions / cessation",
  reduction_percent: "Measured percentage reduction",
};
export const findingTitle = {
  DETECTION_RECORDED: "Detection recorded",
  NO_MATCHING_DETECTIONS_IN_SNAPSHOT: "No matching records",
  INSUFFICIENT_OR_INCOMPATIBLE: "More evidence needed",
  INVALID_INPUT: "Check the claim inputs",
};
export function download(packet: Packet) {
  const blob = new Blob([JSON.stringify(packet, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `afterplume-${packet.payload.claim.sourceId}-r${packet.payload.revision}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const short = (s: string) => s.slice(0, 8) + "…" + s.slice(-6);
