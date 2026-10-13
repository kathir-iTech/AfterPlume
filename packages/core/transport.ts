import { gunzipSync } from "fflate";
import { sha256, SNAPSHOT_SHA } from "./index.ts";
import manifest from "./transport-manifest.json";
export async function decodeSnapshotTransport(
  bytes: Uint8Array,
): Promise<Uint8Array> {
  if (bytes.byteLength > 20_000_000)
    throw new Error("Source archive exceeds its size limit.");
  const digest = await sha256(bytes);
  if (digest === SNAPSHOT_SHA) return bytes;
  if (bytes.byteLength !== manifest.encodedBytes || digest !== manifest.sha256)
    throw new Error(
      "Source transport does not match its trusted SHA-256. Nothing was decompressed.",
    );
  const original = gunzipSync(bytes);
  if (
    original.byteLength !== manifest.decodedBytes ||
    (await sha256(original)) !== SNAPSHOT_SHA
  )
    throw new Error(
      "Decoded source archive differs from the original snapshot.",
    );
  return original;
}
export async function fetchKnownSnapshot(): Promise<Uint8Array> {
  let response = await fetch("/data/mars-snapshot.zip.gz", {
    cache: "no-store",
    signal: AbortSignal.timeout(90000),
  });
  if (response.status === 404)
    response = await fetch("/data/mars-snapshot.zip", {
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    });
  if (!response.ok)
    throw new Error(
      "The trusted archive could not be loaded. Try again or import the original ZIP.",
    );
  return decodeSnapshotTransport(new Uint8Array(await response.arrayBuffer()));
}
