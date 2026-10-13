import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  LoaderCircle,
  Play,
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
  "Load the example",
  "Replay the original",
  "Remove one record",
  "Rehash the edited copy",
  "Replay catches the omission",
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
    <section className="proof-tour">
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE PROOF LAB · ACTUAL PACKET REPLAY</p>
          <h1>
            Can a missing plume
            <br />
            <em>survive a new hash?</em>
          </h1>
          <p>
            A hypothetical “no detections” statement meets three real satellite
            records. Then we remove one.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            running ? (epoch.current++, setRunning(false)) : void run()
          }
        >
          {running ? (
            <Square size={16} />
          ) : after ? (
            <RotateCcw size={16} />
          ) : (
            <Play size={16} />
          )}{" "}
          {running ? "Stop tour" : after ? "Replay tour" : "Run tour"}
        </button>
      </div>
      <ol className="proof-steps">
        {steps.map((s, i) => (
          <li
            key={s}
            className={
              stage > i || after ? "done" : stage === i ? "current" : ""
            }
          >
            <span>
              {stage > i || after ? (
                <Check size={15} />
              ) : stage === i && running ? (
                <LoaderCircle size={15} className="spin" />
              ) : (
                i + 1
              )}
            </span>
            {s}
          </li>
        ))}
      </ol>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {after && (
        <div className="proof-verdict" role="status">
          <X size={25} />
          <div>
            <strong>The missing record was caught.</strong>
            <p>
              Edited file integrity: <b>{after.integrity.status}</b> ·
              Full-source inclusion: <b>{after.snapshot.status}</b>
            </p>
          </div>
          <span className="pill red">ACTUAL REPLAY RESULT</span>
        </div>
      )}
      <div className="proof-comparison">
        <article className="proof-packet original">
          <div className="packet-head">
            <span className="eyebrow">01 · ORIGINAL REVIEW</span>
            <span className="pill teal">
              {before ? "Replay complete" : "Example packet"}
            </span>
          </div>
          <div className="proof-count">
            {original?.payload.records.length ?? "—"}
            <span>matching detections</span>
          </div>
          <p>
            {original?.payload.claim.sourceId ?? "AZE_S_010"} · 1 May → 1 June
            2026 inclusive
          </p>
          <div className="proof-records">
            {original?.payload.records.map((r) => (
              <div key={r.id}>
                <span>{r.acquired.slice(0, 10)}</span>
                <strong>{r.satellite.split(" - ")[0]}</strong>
                <span>
                  {r.rate
                    ? `${Number(r.rate).toLocaleString()} kg/h`
                    : "rate not reported"}
                </span>
              </div>
            ))}
          </div>
          <div className="proof-checks">
            <p>
              <Check size={17} />
              <span>File integrity</span>
              <strong>{before?.integrity.status ?? "Waiting"}</strong>
            </p>
            <p>
              <Check size={17} />
              <span>Full-source inclusion</span>
              <strong>{before?.snapshot.status ?? "Waiting"}</strong>
            </p>
          </div>
          {original && (
            <details className="digest-detail">
              <summary>Inspect the original digest</summary>
              <code>{original.digest}</code>
            </details>
          )}
        </article>
        <article className={`proof-packet edited ${after ? "revealed" : ""}`}>
          <div className="packet-head">
            <span className="eyebrow">02 · EDITED & REHASHED</span>
            <span className={`pill ${after ? "red" : "neutral"}`}>
              {after ? "Omission caught" : "Adversarial copy"}
            </span>
          </div>
          <div className="proof-count">
            {edited?.payload.records.length ?? "—"}
            <span>detections left in the packet</span>
          </div>
          <p>
            The last observation is removed. The finding and digest are
            recomputed.
          </p>
          <div className="proof-records">
            {original?.payload.records.map((r, i) => (
              <div
                key={r.id}
                className={
                  stage >= 2 && i === original.payload.records.length - 1
                    ? "removed"
                    : ""
                }
              >
                <span>{r.acquired.slice(0, 10)}</span>
                <strong>{r.satellite.split(" - ")[0]}</strong>
                <span>
                  {stage >= 2 && i === original.payload.records.length - 1
                    ? "REMOVED"
                    : r.rate
                      ? `${Number(r.rate).toLocaleString()} kg/h`
                      : "rate not reported"}
                </span>
              </div>
            ))}
          </div>
          <div className="proof-checks">
            <p>
              <Check size={17} />
              <span>File integrity</span>
              <strong>{after?.integrity.status ?? "Waiting"}</strong>
            </p>
            <p className={after ? "mismatch" : ""}>
              <X size={17} />
              <span>Full-source inclusion</span>
              <strong>{after?.snapshot.status ?? "Waiting"}</strong>
            </p>
          </div>
          {edited && (
            <details className="digest-detail">
              <summary>Inspect the rebuilt digest</summary>
              <code>{edited.digest}</code>
            </details>
          )}
        </article>
      </div>
      <div className="proof-reveal" aria-live="polite">
        {after ? (
          <>
            <span className="pill red">THE MISSING RECORD WAS DETECTED</span>
            <h2>
              A fresh hash passed.
              <br />
              The incomplete evidence didn’t.
            </h2>
            <p>
              The verifier checked every matching record in the original
              hash-pinned ZIP. File integrity and evidence completeness answer
              different questions.
            </p>
          </>
        ) : (
          <>
            <h2>
              {running ? steps[Math.max(stage, 0)] : "Run the proof yourself."}
            </h2>
            <p>
              {running
                ? "Real checks are running in your browser. The first replay downloads the 10.8 MB archive."
                : "Replay the example, inspect the outputs and download both packets."}
            </p>
          </>
        )}
      </div>
      <div className="proof-bottom">
        <button className="button primary" onClick={openReview}>
          Review a statement yourself <ArrowRight size={17} />
        </button>
        {original && (
          <button
            className="button secondary"
            onClick={() => save(original, "afterplume-original.json")}
          >
            <Download size={16} /> Original packet
          </button>
        )}
        {edited && (
          <button
            className="button secondary"
            onClick={() => save(edited, "afterplume-omitted-rehashed.json")}
          >
            <Download size={16} /> Edited packet
          </button>
        )}
        <button className="text-button" onClick={openLedger}>
          See registry lifecycle evidence <ArrowRight size={15} />
        </button>
      </div>
      <details className="proof-boundaries">
        <summary>What the demonstration establishes</summary>
        <p>
          It catches an omission relative to this exact snapshot. It does not
          establish physical repair, zero emissions, operator dishonesty or
          future observations. This example is unpublished: external blockchain
          commitment is not established. The source archive is hash-pinned by
          AfterPlume, not digitally signed by UNEP.
        </p>
      </details>
    </section>
  );
}
