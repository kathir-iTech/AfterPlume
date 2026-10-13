import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { decodeSnapshotTransport } from "../packages/core/transport.ts";
import {
  sha256,
  SNAPSHOT_SHA,
  readKnownSnapshot,
} from "../packages/core/index.ts";
const original = await readFile(
  new URL("../apps/web/public/data/mars-snapshot.zip", import.meta.url),
);
const encoded = await readFile(
  new URL("../apps/web/public/data/mars-snapshot.zip.gz", import.meta.url),
);
it("compressed transport restores every original archive byte and source record", async () => {
  const decoded = await decodeSnapshotTransport(encoded);
  expect(Buffer.from(decoded).equals(original)).toBe(true);
  expect(await sha256(decoded)).toBe(SNAPSHOT_SHA);
  const source = await readKnownSnapshot(decoded);
  expect(source.records).toHaveLength(30319);
  expect(source.sourceIds.size).toBe(4211);
});
it("original archive remains accepted without a transport envelope", async () => {
  expect(await decodeSnapshotTransport(original)).toBe(original);
});
it("a mutated compressed envelope is rejected before decompression", async () => {
  const corrupt = new Uint8Array(encoded);
  corrupt[12] ^= 1;
  await expect(decodeSnapshotTransport(corrupt)).rejects.toThrow(
    "Nothing was decompressed",
  );
});
