import { defineConfig } from "hardhat/config";
import toolbox from "@nomicfoundation/hardhat-toolbox-viem";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export default defineConfig({
  plugins: [toolbox],
  paths: {
    sources: "contracts/contracts",
    tests: { nodejs: "contracts/test" },
  },
  solidity: {
    version: "0.8.28",
    path: require.resolve("solc/soljson.js"),
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localhost: { type: "http", chainType: "l1", url: "http://127.0.0.1:8545" },
  },
});
