import { useState } from "react";
import {
  GitBranch,
  X,
  ArrowUpRight,
  Check,
  UserCheck,
  TriangleAlert,
} from "lucide-react";
import {
  ledgerAction,
  type LedgerConfig,
} from "../../../packages/core/ledger.ts";
import type { Packet } from "../../../packages/core/index.ts";
import type { EIP1193Provider } from "viem";
export default function LedgerPanel({
  config,
  packet,
  busy,
  publish,
  onClose,
  onError,
}: {
  config: LedgerConfig;
  packet?: Packet;
  busy: boolean;
  publish: () => Promise<void>;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  async function act(
    action: "authorize" | "acknowledge" | "withdraw",
    value: string,
  ) {
    if (!packet) return;
    setPending(true);
    onError("");
    try {
      const provider = (window as unknown as { ethereum?: EIP1193Provider })
        .ethereum;
      if (!provider)
        throw new Error(
          "Enable a browser wallet for this optional ledger action.",
        );
      setStatus(
        await ledgerAction(packet, config, provider, action, value, setStatus),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Ledger action failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel ledger-panel">
      <div className="panel-heading">
        <GitBranch size={18} />
        <h2>Optional ledger</h2>
        <button
          className="icon-button"
          aria-label="Close ledger"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <span className="pill amber">{config.label}</span>
      <p>
        Chain {config.chainId} · {config.address}
        <br />A successful transaction records the packet digest. It does not
        certify the claim. Switch wallet accounts to act as an authorized
        reviewer.
      </p>
      <button
        className="button primary"
        disabled={
          !packet ||
          packet.payload.response.action === "pending" ||
          busy ||
          pending ||
          !!packet.receipt
        }
        onClick={publish}
      >
        <ArrowUpRight size={16} />
        {busy
          ? "Waiting for confirmation…"
          : packet?.receipt
            ? "Commitment attached"
            : "Publish completed review"}
      </button>
      {packet?.receipt && (
        <div className="ledger-actions">
          <div>
            <label className="field-label" htmlFor="reviewer-address">
              Reviewer address · owner authorizes
            </label>
            <input
              id="reviewer-address"
              placeholder="0x… distinct from owner"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
            />
            <button
              className="button secondary"
              disabled={pending || busy}
              onClick={() => act("authorize", reviewer)}
            >
              <UserCheck size={15} /> Authorize reviewer
            </button>
          </div>
          <div>
            <label className="field-label" htmlFor="reviewer-note">
              Review acknowledgement · reviewer submits
            </label>
            <textarea
              id="reviewer-note"
              placeholder="I reviewed this exact evidence packet and understand its limits."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="button secondary"
              disabled={pending || busy}
              onClick={() => act("acknowledge", note)}
            >
              <Check size={15} /> Acknowledge current revision
            </button>
          </div>
          <div>
            <h3>Terminal withdrawal · owner submits</h3>
            <p>
              Preserves all earlier revisions and acknowledgements. No later
              revisions or acknowledgements can be added to this case.
            </p>
            <button
              className="button secondary"
              disabled={pending || busy}
              onClick={() => act("withdraw", "")}
            >
              <TriangleAlert size={15} /> Withdraw ledger case
            </button>
          </div>
        </div>
      )}
      <p role="status">{status}</p>
    </section>
  );
}
