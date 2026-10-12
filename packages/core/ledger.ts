import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  parseAbi,
  decodeEventLog,
  isAddress,
  type Address,
  type Hex,
  type EIP1193Provider,
} from "viem";
import { hardhat, sepolia } from "viem/chains";
import { digestPayload, type Packet, type LedgerReceipt } from "./index.ts";
import type { Check } from "../verifier/index.ts";
import artifact from "./registry-artifact.json";

export function expectedRuntimeCode(salt: Hex): Hex {
  let code = artifact.deployedBytecode.slice(2);
  for (const refs of Object.values(artifact.immutableReferences))
    for (const ref of refs) {
      if (ref.length !== 32)
        throw new Error("Unexpected registry immutable length.");
      const start = ref.start * 2;
      code =
        code.slice(0, start) +
        salt.slice(2).toLowerCase() +
        code.slice(start + ref.length * 2);
    }
  return `0x${code}`;
}
export const registryAbi = parseAbi([
  "function deploymentSalt() view returns (bytes32)",
  "function protocol() view returns (string)",
  "function cases(bytes32) view returns (address owner, bool active, uint64 revision, bytes32 digest)",
  "function revisionDigests(bytes32,uint64) view returns (bytes32)",
  "function acknowledgements(bytes32,uint64) view returns (address reviewer, bytes32 responseHash)",
  "function createCase(bytes32 digest) returns (bytes32 caseId)",
  "function publishRevision(bytes32 caseId,uint64 nextRevision,bytes32 previousDigest,bytes32 digest)",
  "function authorizeReviewer(bytes32 caseId,address reviewer,bool authorized)",
  "function acknowledgeReview(bytes32 caseId,uint64 revision,bytes32 digest,bytes32 responseHash)",
  "function withdrawCase(bytes32 caseId)",
  "event CaseCreated(bytes32 indexed caseId,address indexed owner,uint64 revision,bytes32 digest)",
  "event RevisionPublished(bytes32 indexed caseId,uint64 revision,bytes32 previousDigest,bytes32 digest)",
  "event ReviewAcknowledged(bytes32 indexed caseId,uint64 revision,address indexed reviewer,bytes32 digest,bytes32 responseHash)",
  "event CaseWithdrawn(bytes32 indexed caseId,uint64 revision,bytes32 digest)",
]);
export type LedgerConfig = {
  chainId: number;
  address: Address;
  deploymentSalt: Hex;
  rpcUrl: string;
  label: string;
};
export const chainFor = (id: number) =>
  id === 11155111 ? sepolia : id === 31337 ? hardhat : undefined;
export async function verifyAnchor(
  packet: Packet,
  rpcUrl: string,
): Promise<Check> {
  const r = packet.receipt;
  if (!r)
    return { status: "NOT_ESTABLISHED", detail: "No blockchain receipt." };
  const chain = chainFor(r.chainId);
  if (!chain)
    return {
      status: "NOT_ESTABLISHED",
      detail: "Unsupported chain. No request sent.",
    };
  try {
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl, { timeout: 12000, retryCount: 0 }),
    });
    if ((await client.getChainId()) !== r.chainId)
      return {
        status: "MISMATCH",
        detail: "RPC chain ID differs from receipt.",
      };
    const computed = `0x${await digestPayload(packet.payload)}`;
    if (
      computed !== r.digest ||
      computed !== `0x${packet.digest}` ||
      packet.payload.revision !== r.revision
    )
      return {
        status: "MISMATCH",
        detail:
          "Packet digest or revision differs from the attached commitment.",
      };
    const tx = await client.getTransactionReceipt({ hash: r.txHash as Hex });
    const block = await client.getBlockNumber({ cacheTime: 0 });
    if (tx.blockNumber > block)
      return {
        status: "NOT_ESTABLISHED",
        detail: "RPC has not established the receipt block yet.",
      };
    const address = r.contract as Address;
    const salt = await client.readContract({
      address,
      abi: registryAbi,
      functionName: "deploymentSalt",
      blockNumber: block,
    });
    const code = await client.getCode({ address, blockNumber: block });
    if (
      code?.toLowerCase() !==
      expectedRuntimeCode(r.deploymentSalt as Hex).toLowerCase()
    )
      return {
        status: "MISMATCH",
        detail:
          "Deployed code differs from the compiled ReviewRegistry. No role or revision guarantees are inferred.",
      };
    const protocol = await client.readContract({
      address,
      abi: registryAbi,
      functionName: "protocol",
      blockNumber: block,
    });
    if (
      tx.status !== "success" ||
      salt !== r.deploymentSalt ||
      protocol !== "afterplume/1"
    )
      return {
        status: "MISMATCH",
        detail: "Receipt failed or deployment domain does not match.",
      };
    const events = tx.logs
      .filter((l) => l.address.toLowerCase() === address.toLowerCase())
      .flatMap((l) => {
        try {
          return [
            decodeEventLog({
              abi: registryAbi,
              data: l.data,
              topics: l.topics,
            }),
          ];
        } catch {
          return [];
        }
      });
    const published = events.some(
      (e) =>
        (e.eventName === "CaseCreated" ||
          e.eventName === "RevisionPublished") &&
        e.args.caseId === r.caseId &&
        e.args.digest === r.digest &&
        Number(e.args.revision) === r.revision,
    );
    const state = await client.readContract({
      address,
      abi: registryAbi,
      functionName: "cases",
      args: [r.caseId as Hex],
      blockNumber: block,
    });
    const historical = await client.readContract({
      address,
      abi: registryAbi,
      functionName: "revisionDigests",
      args: [r.caseId as Hex, BigInt(r.revision)],
      blockNumber: block,
    });
    if (r.revision === 1 && packet.payload.previousDigest !== null)
      return {
        status: "MISMATCH",
        detail: "First anchored revision has an unexpected predecessor.",
      };
    if (r.revision > 1) {
      const prior = await client.readContract({
        address,
        abi: registryAbi,
        functionName: "revisionDigests",
        args: [r.caseId as Hex, BigInt(r.revision - 1)],
        blockNumber: block,
      });
      if (`0x${packet.payload.previousDigest}` !== prior)
        return {
          status: "MISMATCH",
          detail: "Packet predecessor differs from chain revision history.",
        };
    }
    if (
      !published ||
      historical !== r.digest ||
      state[0].toLowerCase() !== r.owner.toLowerCase()
    )
      return {
        status: "MISMATCH",
        detail:
          "No matching revision event and owner history at this contract.",
      };
    const ack = await client.readContract({
      address,
      abi: registryAbi,
      functionName: "acknowledgements",
      args: [r.caseId as Hex, state[2]],
      blockNumber: block,
    });
    const current = Number(state[2]) === r.revision;
    return {
      status: "MATCH",
      detail: `Commitment matches at block ${block}. Case ${state[1] ? "active" : "withdrawn"}; revision ${r.revision} ${current ? "current" : "superseded"}. ${current && ack[0] !== "0x0000000000000000000000000000000000000000" ? "Current revision acknowledged by an authorized address." : "No current acknowledgement for this packet."} ${r.chainId === 31337 ? "Local resettable chain; no durable public anchor." : "Testnet record; no scientific certification."}`,
    };
  } catch (error) {
    return {
      status: "NOT_ESTABLISHED",
      detail:
        "Live chain read unavailable: " +
        (error instanceof Error ? error.message.slice(0, 180) : "RPC error"),
    };
  }
}
export async function publishPacket(
  packet: Packet,
  config: LedgerConfig,
  provider: EIP1193Provider,
  previous: LedgerReceipt | null,
  onProgress: (s: string) => void,
): Promise<LedgerReceipt> {
  if (packet.payload.response.action === "pending")
    throw new Error("Complete the human response before publishing.");
  const chain = chainFor(config.chainId);
  if (!chain || !isAddress(config.address))
    throw new Error("Invalid ledger configuration.");
  const wallet = createWalletClient({ chain, transport: custom(provider) });
  const [account] = await wallet.requestAddresses();
  if ((await wallet.getChainId()) !== config.chainId)
    throw new Error(
      `Switch your wallet to ${chain.name} (${config.chainId}) and try again.`,
    );
  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl, { timeout: 15000 }),
  });
  const salt = await client.readContract({
    address: config.address,
    abi: registryAbi,
    functionName: "deploymentSalt",
  });
  if (salt !== config.deploymentSalt)
    throw new Error(
      "Deployment salt differs; local chain may have been reset.",
    );
  const digest = `0x${packet.digest}` as Hex;
  onProgress("Confirm the transaction in your wallet.");
  if (!previous && packet.payload.revision !== 1)
    throw new Error("Publish the first revision before later revisions.");
  if (
    previous &&
    (previous.owner.toLowerCase() !== account.toLowerCase() ||
      previous.contract.toLowerCase() !== config.address.toLowerCase() ||
      previous.chainId !== config.chainId ||
      previous.deploymentSalt !== salt ||
      packet.payload.previousDigest !== previous.digest.slice(2))
  )
    throw new Error("Owner, deployment or predecessor does not match.");
  const hash = previous
    ? await wallet.writeContract({
        account,
        address: config.address,
        abi: registryAbi,
        functionName: "publishRevision",
        args: [
          previous.caseId as Hex,
          BigInt(packet.payload.revision),
          previous.digest as Hex,
          digest,
        ],
      })
    : await wallet.writeContract({
        account,
        address: config.address,
        abi: registryAbi,
        functionName: "createCase",
        args: [digest],
      });
  onProgress("Transaction submitted; waiting for a successful receipt.");
  const tx = await client.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 120000,
  });
  if (tx.status !== "success")
    throw new Error("Transaction reverted. No publication recorded.");
  const event = tx.logs
    .filter((l) => l.address.toLowerCase() === config.address.toLowerCase())
    .flatMap((l) => {
      try {
        return [
          decodeEventLog({ abi: registryAbi, data: l.data, topics: l.topics }),
        ];
      } catch {
        return [];
      }
    })
    .find(
      (e) =>
        e.eventName === "CaseCreated" || e.eventName === "RevisionPublished",
    );
  if (!event || !("caseId" in event.args))
    throw new Error("Successful receipt has no matching publication event.");
  const receipt: LedgerReceipt = {
    chainId: config.chainId,
    contract: config.address,
    deploymentSalt: salt,
    caseId: event.args.caseId,
    revision: packet.payload.revision,
    txHash: tx.transactionHash,
    owner: account,
    digest,
  };
  const checked = await verifyAnchor({ ...packet, receipt }, config.rpcUrl);
  if (checked.status !== "MATCH") throw new Error(checked.detail);
  onProgress(checked.detail);
  return receipt;
}
export async function ledgerAction(
  packet: Packet,
  config: LedgerConfig,
  provider: EIP1193Provider,
  action: "authorize" | "acknowledge" | "withdraw",
  value: string,
  onProgress: (s: string) => void,
): Promise<string> {
  const r = packet.receipt;
  if (!r) throw new Error("Publish this revision before a ledger action.");
  if (
    r.contract.toLowerCase() !== config.address.toLowerCase() ||
    r.chainId !== config.chainId ||
    r.deploymentSalt !== config.deploymentSalt
  )
    throw new Error("Receipt belongs to another deployment.");
  const chain = chainFor(config.chainId);
  if (!chain) throw new Error("Unsupported chain.");
  const wallet = createWalletClient({ chain, transport: custom(provider) });
  const [account] = await wallet.requestAddresses();
  if ((await wallet.getChainId()) !== config.chainId)
    throw new Error("Wallet network differs from the registry network.");
  const client = createPublicClient({ chain, transport: http(config.rpcUrl) });
  const state = await client.readContract({
    address: config.address,
    abi: registryAbi,
    functionName: "cases",
    args: [r.caseId as Hex],
  });
  if (!state[1] || Number(state[2]) !== r.revision || state[3] !== r.digest)
    throw new Error(
      "This packet is withdrawn or superseded. Use the current active revision.",
    );
  onProgress("Confirm the ledger action in your wallet.");
  let hash: Hex;
  if (action === "authorize") {
    if (
      !isAddress(value) ||
      value.toLowerCase() === account.toLowerCase() ||
      /^0x0{40}$/i.test(value)
    )
      throw new Error("Enter a distinct, nonzero reviewer address.");
    hash = await wallet.writeContract({
      account,
      address: config.address,
      abi: registryAbi,
      functionName: "authorizeReviewer",
      args: [r.caseId as Hex, value, true],
    });
  } else if (action === "acknowledge") {
    if (value.trim().length < 10)
      throw new Error("Explain the acknowledgement in at least 10 characters.");
    const responseHash =
      `0x${await digestPayload({ caseId: r.caseId, revision: r.revision, digest: r.digest, text: value })}` as Hex;
    hash = await wallet.writeContract({
      account,
      address: config.address,
      abi: registryAbi,
      functionName: "acknowledgeReview",
      args: [
        r.caseId as Hex,
        BigInt(r.revision),
        r.digest as Hex,
        responseHash,
      ],
    });
  } else
    hash = await wallet.writeContract({
      account,
      address: config.address,
      abi: registryAbi,
      functionName: "withdrawCase",
      args: [r.caseId as Hex],
    });
  onProgress("Waiting for the ledger action receipt.");
  const tx = await client.waitForTransactionReceipt({ hash, timeout: 120000 });
  if (tx.status !== "success") throw new Error("Ledger action reverted.");
  return `${action === "authorize" ? "Reviewer authorization" : action === "acknowledge" ? "Acknowledgement" : "Case withdrawal"} recorded. ${(await verifyAnchor(packet, config.rpcUrl)).detail}`;
}
