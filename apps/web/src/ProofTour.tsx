import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  LoaderCircle,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import {
  digestPayload,
  evaluateClaim,
  parsePacket,
  type Packet,
} from "../../../packages/core/index.ts";
import {
  verifyPacket,
  type Verification,
} from "../../../packages/verifier/index.ts";
const steps = [
  "Opening the example…",
  "Checking the original against the source…",
  "Removing one observation…",
  "Rebuilding the edited file’s hash…",
  "Checking for missing evidence…",
];
function save(packet: Packet, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function ProofTour({
  getZip,
  openReview,
  openLedger,
}: {
  getZip: () => Promise<Uint8Array>;
  openReview: () => void;
  openLedger: () => void;
}) {
  const [stage, setStage] = useState(-1);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState<Packet>();
  const [edited, setEdited] = useState<Packet>();
  const [before, setBefore] = useState<Verification>();
  const [after, setAfter] = useState<Verification>();
  const epoch = useRef(0);
  async function run() {
    const id = ++epoch.current;
    setRunning(true);
    setError("");
    setStage(0);
    setBefore(undefined);
    setAfter(undefined);
    setEdited(undefined);
    setOriginal(undefined);
    const active = () => id === epoch.current;
    const pause = () =>
      new Promise<void>((resolve) =>
        setTimeout(
          resolve,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 650,
        ),
      );
    try {
      const response = await fetch("/data/example-review.json");
      if (!response.ok)
        throw new Error("Example packet unavailable. Reload to try again.");
      const packet = parsePacket(await response.text());
      if (!active()) return;
      setOriginal(packet);
      await pause();
      if (!active()) return;
      setStage(1);
      const bytes = await getZip();
      const valid = await verifyPacket(packet, bytes);
      if (!active()) return;
      setBefore(valid);
      if (
        valid.integrity.status !== "MATCH" ||
        valid.snapshot.status !== "MATCH"
      )
        throw new Error(
          "The original packet did not pass source replay. No successful demonstration is claimed.",
        );
      await pause();
      if (!active()) return;
      setStage(2);
      const records = packet.payload.records.slice(0, -1);
      const payload = {
        ...packet.payload,
        records,
        finding: evaluateClaim(packet.payload.claim, records),
      };
      await pause();
      if (!active()) return;
      setStage(3);
      const changed = {
        ...packet,
        payload,
        digest: await digestPayload(payload),
      };
      if (!active()) return;
      setEdited(changed);
      await pause();
      if (!active()) return;
      setStage(4);
      const result = await verifyPacket(changed, bytes);
      if (!active()) return;
      setAfter(result);
      if (
        result.integrity.status !== "MATCH" ||
        result.snapshot.status !== "MISMATCH"
      )
        throw new Error(
          "The omission test did not produce the expected checks. Inspect the exported packets.",
        );
    } catch (e) {
      if (active())
        setError(e instanceof Error ? e.message : "The proof could not run.");
    } finally {
      if (active()) setRunning(false);
    }
  }
  useEffect(() => {
    void run();
    return () => {
      epoch.current++;
    };
  }, []);
  return (
    <section className="proof-tour focused-proof">
      <div className="section-heading">
        <div>
          <span className="example-tag">
            Interactive example · real observations
          </span>
          <h1>
            One missing record.
            <br />
            <em>Caught.</em>
          </h1>
          <p>
            We remove an observation and rebuild the file’s hash. The source
            check catches the omission.
          </p>
        </div>
        <button
          className="text-button proof-control"
          onClick={() =>
            running ? (epoch.current++, setRunning(false)) : void run()
          }
        >
          {running ? <Square size={14} /> : <RotateCcw size={14} />}{" "}
          {running ? "Stop" : "Replay"}
        </button>
      </div>
      <div className="proof-progress" role="status">
        <span>
          {running
            ? steps[Math.max(stage, 0)]
            : after
              ? "Source check complete"
              : "Tour stopped"}
        </span>
        {running && <LoaderCircle size={15} className="spin" />}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="proof-comparison">
        {(
          [
            {
              kind: "original",
              title: "Original review",
              value: original,
              result: before,
            },
            {
              kind: "edited",
              title: "One record removed",
              value: edited,
              result: after,
            },
          ] as const
        ).map(({ kind, title, value, result }) => (
          <article
            key={kind}
            className={`proof-packet ${kind} ${kind === "edited" && after ? "revealed" : ""}`}
          >
            <div className="packet-head">
              <h2>{title}</h2>
            </div>
            <div className="proof-count">
              {value?.payload.records.length ?? "—"}
              <span>
                {kind === "original"
                  ? "observations included"
                  : "observations remaining"}
              </span>
            </div>
            <div className="proof-records">
              {original?.payload.records.map((r, i) => {
                const removed =
                  kind === "edited" &&
                  stage >= 2 &&
                  i === original.payload.records.length - 1;
                return (
                  <div key={r.id} className={removed ? "removed" : ""}>
                    <span>{r.acquired.slice(0, 10)}</span>
                    <strong>{r.satellite.split(" - ")[0]}</strong>
                    <span>
                      {removed
                        ? "Removed"
                        : r.rate
                          ? `${Number(r.rate).toLocaleString()} kg/h`
                          : "Rate unreported"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="proof-checks">
              {(
                [
                  { label: "File hash", status: result?.integrity.status },
                  {
                    label: "Source completeness",
                    status: result?.snapshot.status,
                  },
                ] as const
              ).map((check) => (
                <p
                  key={check.label}
                  className={
                    check.status === "MISMATCH"
                      ? "mismatch"
                      : check.status
                        ? "match"
                        : "pending"
                  }
                >
                  {check.status === "MISMATCH" ? (
                    <X size={17} />
                  ) : check.status === "MATCH" ? (
                    <Check size={17} />
                  ) : (
                    <span className="pending-dot" />
                  )}
                  <span>{check.label}</span>
                  <strong>{check.status ?? "Waiting"}</strong>
                </p>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="proof-conclusion" aria-live="polite">
        {after ? (
          <>
            <Check size={21} />
            <p>
              <strong>The hash passed. The missing evidence didn’t.</strong>
              <span>
                Compared with every matching record in the pinned source
                archive.
              </span>
            </p>
          </>
        ) : (
          <p>Checking the original source archive.</p>
        )}
      </div>
      <div className="proof-next">
        <button className="button primary" onClick={openReview}>
          Review a statement <ArrowRight size={17} />
        </button>
        <span>Example claim: “no recorded detections” · AZE_S_010</span>
      </div>
      <details className="disclosure proof-inspect">
        <summary>Inspect the files and technical checks</summary>
        <div className="proof-downloads">
          {original && (
            <button
              className="button secondary"
              onClick={() => save(original, "afterplume-original.json")}
            >
              <Download size={15} />
              Original packet
            </button>
          )}
          {edited && (
            <button
              className="button secondary"
              onClick={() => save(edited, "afterplume-omitted-rehashed.json")}
            >
              <Download size={15} />
              Edited packet
            </button>
          )}
        </div>
        {original && (
          <p>
            Original digest <code>{original.digest}</code>
          </p>
        )}
        {edited && (
          <p>
            Rebuilt digest <code>{edited.digest}</code>
          </p>
        )}
        <p>
          Removing a record changes the evidence and finding. The edited copy is
          rehashed, then replayed against the full original ZIP. Integrity
          checks the file itself; source completeness checks the observations it
          should include.
        </p>
        <button className="text-button" onClick={openLedger}>
          See registry lifecycle evidence <ArrowRight size={14} />
        </button>
      </details>
      <details className="disclosure proof-boundaries">
        <summary>Scope of this example</summary>
        <p>
          The statement is hypothetical. The checks establish completeness
          within one pinned snapshot, not physical repair, zero emissions or
          operator dishonesty. No blockchain commitment is attached to these
          example packets. The provider has not digitally signed the archive.
        </p>
      </details>
    </section>
  );
}
