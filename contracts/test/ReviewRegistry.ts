import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { network } from "hardhat";
import {
  keccak256,
  stringToHex,
  decodeEventLog,
  zeroHash,
  zeroAddress,
} from "viem";
const hash = (text: string) => keccak256(stringToHex(text));
describe("ReviewRegistry: nonfinancial revision and reviewer invariants", () => {
  let connection: Awaited<ReturnType<typeof network.create>>;
  beforeEach(async () => {
    connection = await network.create();
  });
  async function fixture() {
    const { viem } = connection;
    const [owner, reviewer, outsider] = await viem.getWalletClients();
    const client = await viem.getPublicClient();
    const registry = await viem.deployContract("ReviewRegistry", [
      hash("test-deployment-salt"),
    ]);
    const tx = await registry.write.createCase([hash("revision-1")]);
    const receipt = await client.waitForTransactionReceipt({ hash: tx });
    const e = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: registry.abi,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return undefined;
        }
      })
      .find((e) => e?.eventName === "CaseCreated");
    assert(e && e.eventName === "CaseCreated");
    return {
      registry,
      owner,
      reviewer,
      outsider,
      client,
      caseId: e.args.caseId,
    };
  }
  it("creates owner-namespaced active revision 1", async () => {
    const { registry, owner, caseId } = await fixture();
    const c = await registry.read.cases([caseId]);
    assert.equal(c[0].toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(c[1], true);
    assert.equal(c[2], 1n);
    assert.equal(c[3], hash("revision-1"));
  });
  it("rejects zero digest creation", async () => {
    const { registry } = await fixture();
    await assert.rejects(registry.write.createCase([zeroHash]));
  });
  it("separates two cases from the same owner", async () => {
    const { registry, owner } = await fixture();
    assert.equal(await registry.read.nonces([owner.account.address]), 1n);
    await registry.write.createCase([hash("second-case")]);
    assert.equal(await registry.read.nonces([owner.account.address]), 2n);
  });
  it("rejects revision updates by another address", async () => {
    const { registry, outsider, caseId } = await fixture();
    await assert.rejects(
      registry.write.publishRevision(
        [caseId, 2n, hash("revision-1"), hash("revision-2")],
        { account: outsider.account },
      ),
    );
  });
  it("rejects skipped revisions", async () => {
    const { registry, caseId } = await fixture();
    await assert.rejects(
      registry.write.publishRevision([
        caseId,
        3n,
        hash("revision-1"),
        hash("revision-3"),
      ]),
    );
  });
  it("rejects a stale predecessor digest", async () => {
    const { registry, caseId } = await fixture();
    await assert.rejects(
      registry.write.publishRevision([
        caseId,
        2n,
        hash("different-packet"),
        hash("revision-2"),
      ]),
    );
  });
  it("rejects a zero replacement digest", async () => {
    const { registry, caseId } = await fixture();
    await assert.rejects(
      registry.write.publishRevision([
        caseId,
        2n,
        hash("revision-1"),
        zeroHash,
      ]),
    );
  });
  it("rejects an unchanged replacement digest", async () => {
    const { registry, caseId } = await fixture();
    await assert.rejects(
      registry.write.publishRevision([
        caseId,
        2n,
        hash("revision-1"),
        hash("revision-1"),
      ]),
    );
  });
  it("preserves the prior digest after a new revision", async () => {
    const { registry, caseId } = await fixture();
    await registry.write.publishRevision([
      caseId,
      2n,
      hash("revision-1"),
      hash("revision-2"),
    ]);
    assert.equal(
      await registry.read.revisionDigests([caseId, 1n]),
      hash("revision-1"),
    );
    assert.equal((await registry.read.cases([caseId]))[2], 2n);
  });
  it("rejects an unauthorized reviewer", async () => {
    const { registry, reviewer, caseId } = await fixture();
    await assert.rejects(
      registry.write.acknowledgeReview(
        [caseId, 1n, hash("revision-1"), hash("response")],
        { account: reviewer.account },
      ),
    );
  });
  it("prevents self-review and zero reviewer authorization", async () => {
    const { registry, owner, caseId } = await fixture();
    await assert.rejects(
      registry.write.authorizeReviewer([caseId, owner.account.address, true]),
    );
    await assert.rejects(
      registry.write.authorizeReviewer([caseId, zeroAddress, true]),
    );
  });
  it("only owner can authorize a reviewer", async () => {
    const { registry, reviewer, outsider, caseId } = await fixture();
    await assert.rejects(
      registry.write.authorizeReviewer(
        [caseId, reviewer.account.address, true],
        { account: outsider.account },
      ),
    );
  });
  it("acknowledges only the current exact packet", async () => {
    const { registry, reviewer, caseId } = await fixture();
    await registry.write.authorizeReviewer([
      caseId,
      reviewer.account.address,
      true,
    ]);
    await assert.rejects(
      registry.write.acknowledgeReview(
        [caseId, 1n, hash("other"), hash("response")],
        { account: reviewer.account },
      ),
    );
    await registry.write.acknowledgeReview(
      [caseId, 1n, hash("revision-1"), hash("response")],
      { account: reviewer.account },
    );
    assert.equal(
      (await registry.read.acknowledgements([caseId, 1n]))[0].toLowerCase(),
      reviewer.account.address.toLowerCase(),
    );
  });
  it("requires a nonzero acknowledgement response hash", async () => {
    const { registry, reviewer, caseId } = await fixture();
    await registry.write.authorizeReviewer([
      caseId,
      reviewer.account.address,
      true,
    ]);
    await assert.rejects(
      registry.write.acknowledgeReview(
        [caseId, 1n, hash("revision-1"), zeroHash],
        { account: reviewer.account },
      ),
    );
  });
  it("old acknowledgement stays historical after new revision", async () => {
    const { registry, reviewer, caseId } = await fixture();
    await registry.write.authorizeReviewer([
      caseId,
      reviewer.account.address,
      true,
    ]);
    await registry.write.acknowledgeReview(
      [caseId, 1n, hash("revision-1"), hash("response")],
      { account: reviewer.account },
    );
    await registry.write.publishRevision([
      caseId,
      2n,
      hash("revision-1"),
      hash("revision-2"),
    ]);
    assert.notEqual(
      (await registry.read.acknowledgements([caseId, 1n]))[0],
      zeroAddress,
    );
    assert.equal(
      (await registry.read.acknowledgements([caseId, 2n]))[0],
      zeroAddress,
    );
    await assert.rejects(
      registry.write.acknowledgeReview(
        [caseId, 1n, hash("revision-1"), hash("response")],
        { account: reviewer.account },
      ),
    );
  });
  it("revoking authorization prevents later acknowledgement", async () => {
    const { registry, reviewer, caseId } = await fixture();
    await registry.write.authorizeReviewer([
      caseId,
      reviewer.account.address,
      true,
    ]);
    await registry.write.authorizeReviewer([
      caseId,
      reviewer.account.address,
      false,
    ]);
    await assert.rejects(
      registry.write.acknowledgeReview(
        [caseId, 1n, hash("revision-1"), hash("response")],
        { account: reviewer.account },
      ),
    );
  });
  it("withdrawal is terminal and preserves digest history", async () => {
    const { registry, caseId } = await fixture();
    await registry.write.withdrawCase([caseId]);
    assert.equal((await registry.read.cases([caseId]))[1], false);
    assert.equal(
      await registry.read.revisionDigests([caseId, 1n]),
      hash("revision-1"),
    );
    await assert.rejects(
      registry.write.publishRevision([
        caseId,
        2n,
        hash("revision-1"),
        hash("revision-2"),
      ]),
    );
    await assert.rejects(registry.write.withdrawCase([caseId]));
  });
  it("another owner cannot withdraw a case", async () => {
    const { registry, outsider, caseId } = await fixture();
    await assert.rejects(
      registry.write.withdrawCase([caseId], { account: outsider.account }),
    );
  });
  it("deployment domain salt is immutable and distinct", async () => {
    const { registry } = await fixture();
    const second = await connection.viem.deployContract("ReviewRegistry", [
      hash("another-deployment"),
    ]);
    assert.notEqual(
      await registry.read.deploymentSalt(),
      await second.read.deploymentSalt(),
    );
  });
});
