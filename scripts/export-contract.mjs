import { readFile, writeFile } from "node:fs/promises";
const artifact = JSON.parse(
  await readFile(
    new URL(
      "../artifacts/contracts/contracts/ReviewRegistry.sol/ReviewRegistry.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
await writeFile(
  new URL("../packages/core/registry-artifact.json", import.meta.url),
  JSON.stringify(
    {
      contractName: artifact.contractName,
      compiler: "0.8.28",
      optimizerRuns: 200,
      evmVersion: "cancun",
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
      immutableReferences: artifact.immutableReferences,
    },
    null,
    2,
  ),
);
console.log(
  "Registry ABI and bytecode exported from the compiled Solidity source.",
);
