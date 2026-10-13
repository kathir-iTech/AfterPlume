import { useEffect, useState } from "react";
import { ArrowUpRight, Check, X } from "lucide-react";
type Evidence = {
  scope: string;
  generated: string;
  config: { address: string; chainId: number };
  receipts: { revision: number; txHash: string; digest: string }[];
  trace: { operation: string; result: string }[];
};
export default function LedgerEvidence({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Evidence>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/data/ledger-validation.json")
      .then((r) => {
        if (!r.ok) throw new Error("Recorded evidence could not be loaded.");
        return r.json();
      })
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section
      className="panel ledger-evidence"
      tabIndex={-1}
      aria-label="Registry lifecycle evidence"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">SOLIDITY · RECORDED EXECUTION</p>
          <h2>The review has a revision history.</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close registry evidence"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="ledger-scope">
        Actual transactions on a <strong>local, resettable EVM</strong>. This is
        recorded test evidence, not a live public-chain confirmation.
      </p>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading recorded execution…</p>}
      {data && (
        <>
          <div className="lifecycle-grid">
            {[
              "Publish exact digest",
              "Authorize distinct reviewer",
              "Acknowledge revision 1",
              "Publish revision 2",
              "Keep old acknowledgement historical",
              "Withdraw the case",
            ].map((s, i) => (
              <div key={s}>
                <span>{i + 1}</span>
                <Check size={18} />
                <h3>{s}</h3>
              </div>
            ))}
          </div>
          <details>
            <summary>Inspect actual recorded receipts & state checks</summary>
            <p>{data.scope}</p>
            <dl>
              <dt>Chain ID</dt>
              <dd>{data.config.chainId}</dd>
              <dt>Contract</dt>
              <dd>
                <code>{data.config.address}</code>
              </dd>
              <dt>Recorded</dt>
              <dd>{data.generated}</dd>
            </dl>
            {data.receipts.map((r) => (
              <div className="receipt-details" key={r.txHash}>
                <h3>Revision {r.revision}</h3>
                <p>
                  Transaction <code>{r.txHash}</code>
                </p>
                <p>
                  Digest <code>{r.digest}</code>
                </p>
              </div>
            ))}
            {data.trace
              .filter((t) => t.operation !== "publication-progress")
              .map((t, i) => (
                <p key={i}>
                  <strong>{t.operation}</strong>: {t.result}
                </p>
              ))}
          </details>
        </>
      )}
      <div className="ledger-links">
        <a
          className="button secondary"
          href="https://github.com/kathir-iTech/AfterPlume/blob/main/docs/PROTOCOL.md"
          target="_blank"
          rel="noreferrer"
        >
          Inspect the protocol <ArrowUpRight size={16} />
        </a>
        <a
          className="text-button"
          href="https://github.com/kathir-iTech/AfterPlume#local-evm-ledger"
          target="_blank"
          rel="noreferrer"
        >
          Run the contract yourself <ArrowUpRight size={16} />
        </a>
      </div>
      <p className="field-help">
        No public deployment is configured. A contract preserves digests and
        authorization; it cannot certify scientific truth.
      </p>
    </section>
  );
}
