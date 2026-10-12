import { network } from "hardhat";
import { randomBytes } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
const { viem } = await network.create("localhost");
const salt = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
const registry = await viem.deployContract("ReviewRegistry", [salt]);
const client = await viem.getPublicClient();
const chainId = await client.getChainId();
const output = {
  chainId,
  address: registry.address,
  deploymentSalt: salt,
  rpcUrl: "http://127.0.0.1:8545",
  label: "Local development chain — resettable, not a public anchor",
};
await mkdir(new URL("../../apps/web/public/ledger/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../../apps/web/public/ledger/local.json", import.meta.url),
  JSON.stringify(output, null, 2),
);
console.log(JSON.stringify(output, null, 2));
