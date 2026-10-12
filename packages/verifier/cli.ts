import { readFile } from "node:fs/promises";
import { parsePacket } from "../core/index.ts";
import { verifyPacket } from "./index.ts";
import { verifyAnchor } from "../core/ledger.ts";
const [file, zip, rpc] = process.argv.slice(2);
if (!file) {
  console.error(
    "Usage: npm run verify -- packet.json [trusted-snapshot.zip] [known-chain-rpc-url]",
  );
  process.exit(2);
}
try {
  const packet = parsePacket(await readFile(file, "utf8"));
  const report = await verifyPacket(
    packet,
    zip ? await readFile(zip) : undefined,
  );
  if (rpc && packet.receipt) report.anchor = await verifyAnchor(packet, rpc);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = Object.values(report).some((c) => c.status === "MISMATCH")
    ? 1
    : report.snapshot.status==='NOT_ESTABLISHED'||(packet.receipt&&report.anchor.status==='NOT_ESTABLISHED')?3:0;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
