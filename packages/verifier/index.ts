import {
  canonical,
  digestPayload,
  evaluateClaim,
  policyDigest,
  readKnownSnapshot,
  selectRecords,
  KNOWN_SNAPSHOT,
  type Packet,
} from "../core/index.ts";
export type Check = {
  status: "MATCH" | "MISMATCH" | "NOT_ESTABLISHED";
  detail: string;
};
export type Verification = { integrity: Check; snapshot: Check; anchor: Check };
export async function verifyPacket(
  packet: Packet,
  knownZip?: Uint8Array,
): Promise<Verification> {
  const digest = await digestPayload(packet.payload);
  const integrity: Check = {
    status: digest === packet.digest ? "MATCH" : "MISMATCH",
    detail:
      digest === packet.digest
        ? "Canonical payload matches its declared digest. This is self-consistency; it does not prove completeness."
        : "Canonical payload does not match the declared digest.",
  };
  let snapshot: Check = {
    status: "NOT_ESTABLISHED",
    detail:
      "Full trusted source snapshot has not been supplied. Included rows alone cannot establish inclusion.",
  };
  if (knownZip) {
    try {
      const { records, sourceIds } = await readKnownSnapshot(knownZip);
      const chosen = selectRecords(packet.payload.claim, records);
      const expected = evaluateClaim(
        packet.payload.claim,
        records,
        sourceIds.has(packet.payload.claim.sourceId),
      );
      const matches =
        canonical(packet.payload.snapshot) === canonical(KNOWN_SNAPSHOT) &&
        packet.payload.snapshot.recordCount === records.length &&
        packet.payload.snapshot.sourceCount === sourceIds.size &&
        packet.payload.assistance.confirmedByHuman &&
        packet.payload.policy.sha256 === (await policyDigest()) &&
        canonical(chosen) === canonical(packet.payload.records) &&
        canonical(expected) === canonical(packet.payload.finding);
      snapshot = {
        status: matches ? "MATCH" : "MISMATCH",
        detail: matches
          ? `All ${chosen.length} matching records are included and the policy result replays against ${records.length.toLocaleString("en-US")} source rows. Completeness is limited to this pinned snapshot.`
          : "Included evidence, source manifest, policy or result differs from replay against the full trusted snapshot.",
      };
    } catch (error) {
      snapshot = {
        status: "NOT_ESTABLISHED",
        detail:
          error instanceof Error ? error.message : "Could not read snapshot.",
      };
    }
  }
  return {
    integrity,
    snapshot,
    anchor: {
      status: "NOT_ESTABLISHED",
      detail: packet.receipt
        ? "A receipt is attached. Live chain verification is required."
        : "No external blockchain commitment attached.",
    },
  };
}
