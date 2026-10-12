import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  FileCheck2,
  FileJson,
  FlaskConical,
  GitBranch,
  Globe2,
  Info,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import {
  createPacket,
  digestPayload,
  evaluateClaim,
  MODEL,
  parsePacket,
  selectRecords,
  type Claim,
  type HumanResponse,
  type Packet,
  type PlumeRecord,
  type SnapshotManifest,
} from "../../../packages/core/index.ts";
import { cards, lexicalRank } from "../../../packages/retrieval/index.ts";
import {
  verifyPacket,
  type Verification,
} from "../../../packages/verifier/index.ts";
import {
  publishPacket,
  verifyAnchor,
  type LedgerConfig,
} from "../../../packages/core/ledger.ts";
import type { EIP1193Provider } from "viem";
import LedgerPanel from "./LedgerPanel.tsx";

type Fixture = {
  manifest: SnapshotManifest;
  sources: Record<string, string>[];
  records: PlumeRecord[];
};
type Assistance = Packet["payload"]["assistance"];
type LocalAI = {
  engine: "semantic-local";
  guidanceIds: string[];
  suggestedKind: Claim["kind"];
  milliseconds: number;
  dimensions: number;
};
const initialClaim: Claim = {
  text: "No methane detections were recorded for source AZE_S_010 between 1 May and 1 June 2026 inclusive.",
  kind: "no_detections",
  sourceId: "AZE_S_010",
  start: "2026-05-01",
  end: "2026-06-02",
  hypothetical: true,
  timeBasis: "provider-calendar-date",
};
const emptyResponse: HumanResponse = {
  action: "pending",
  explanation: "",
  revisedText: "",
};
const none: Assistance = {
  engine: "none",
  model: "",
  modelRevision: "",
  suggestedKind: null,
  confirmedByHuman: true,
  guidanceIds: [],
};
const titles: Record<Claim["kind"], string> = {
  no_detections: "No recorded detections",
  repair_occurred: "Repair occurred on a date",
  zero_emissions: "Zero emissions / cessation",
  reduction_percent: "Measured percentage reduction",
};
const findingTitle = {
  DETECTION_RECORDED: "Detection recorded",
  NO_MATCHING_DETECTIONS_IN_SNAPSHOT: "No matching records",
  INSUFFICIENT_OR_INCOMPATIBLE: "More evidence needed",
  INVALID_INPUT: "Check the claim inputs",
};
function download(packet: Packet) {
  const blob = new Blob([JSON.stringify(packet, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `afterplume-${packet.payload.claim.sourceId}-r${packet.payload.revision}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const short = (s: string) => s.slice(0, 8) + "…" + s.slice(-6);
function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
function CheckRow({
  label,
  check,
}: {
  label: string;
  check: Verification["integrity"];
}) {
  return (
    <div className={"verification-check " + check.status.toLowerCase()}>
      <span className="check-icon">
        {check.status === "MATCH" ? (
          <Check size={19} />
        ) : check.status === "MISMATCH" ? (
          <X size={19} />
        ) : (
          <Info size={19} />
        )}
      </span>
      <div>
        <h3>
          {label}
          <Pill
            tone={
              check.status === "MATCH"
                ? "teal"
                : check.status === "MISMATCH"
                  ? "red"
                  : "amber"
            }
          >
            {check.status.replaceAll("_", " ")}
          </Pill>
        </h3>
        <p>{check.detail}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [fixture, setFixture] = useState<Fixture>();
  const [fatal, setFatal] = useState("");
  const [claim, setClaim] = useState<Claim>(initialClaim);
  const [packet, setPacket] = useState<Packet>();
  const [history, setHistory] = useState<Packet[]>([]);
  const [response, setResponse] = useState<HumanResponse>(emptyResponse);
  const [tab, setTab] = useState<"review" | "verify" | "method">("review");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [assistance, setAssistance] = useState<Assistance>(none);
  const [aiStatus, setAiStatus] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInfo, setAiInfo] = useState<LocalAI>();
  const [expanded, setExpanded] = useState<string>();
  const [verifyInput, setVerifyInput] = useState("");
  const [report, setReport] = useState<Verification>();
  const [verifyPacketValue, setVerifyPacketValue] = useState<Packet>();
  const [ledger, setLedger] = useState<LedgerConfig>();
  const [showLedger, setShowLedger] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chainMessage, setChainMessage] = useState("");
  const worker = useRef<Worker | undefined>(undefined);
  const queryId = useRef(0);
  const finishedAI=useRef<number|null>(null);
  const zip = useRef<Uint8Array | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    fetch("/data/case.json")
      .then((r) => {
        if (!r.ok) throw new Error("Public case could not be loaded.");
        return r.json();
      })
      .then((d: Fixture) => {
        if (live) setFixture(d);
      })
      .catch((e) => {
        if (live) setFatal(e.message);
      });
    try {
      const saved = localStorage.getItem("afterplume-history-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as unknown[];
        setHistory(
          parsed.slice(-20).map((p) => parsePacket(JSON.stringify(p))),
        );
      }
    } catch {
      /* Corrupt local history is ignored; it cannot enter verification. */
    }
    return () => {
      live = false;
      worker.current?.terminate();
    };
  }, []);
  useEffect(() => {
    if (history.length) {
      try {
        localStorage.setItem(
          "afterplume-history-v1",
          JSON.stringify(history.slice(-20)),
        );
      } catch {
        setNotice(
          "Browser storage is full. Export the packet to preserve this review.",
        );
      }
    }
  }, [history]);
  async function getZip() {
    if (!zip.current) {
      const r = await fetch("/data/mars-snapshot.zip");
      if (!r.ok)
        throw new Error(
          "Full trusted snapshot unavailable. Import the pinned ZIP to continue.",
        );
      zip.current = new Uint8Array(await r.arrayBuffer());
    }
    return zip.current;
  }
  function changeClaim(part: Partial<Claim>) {
    queryId.current++;
    setAiBusy(false);
    setClaim((c) => ({ ...c, ...part }));
    setPacket(undefined);
    setResponse(emptyResponse);
    setError("");
    setAssistance(none);
    setAiInfo(undefined);
    setAiStatus("");
  }
  async function runReview() {
    if (!fixture) return;
    setError("");
    setBusy("review");
    try {
      const previous = history.at(-1);
      const created = await createPacket(
        {
          revision: (previous?.payload.revision ?? 0) + 1,
          previousDigest: previous?.digest ?? null,
          created: new Date().toISOString(),
          claim,
          snapshot: fixture.manifest,
          response: emptyResponse,
          assistance,
        },
        fixture.records,
        fixture.sources.some((s) => s.source_name === claim.sourceId),
      );
      setPacket(created);
      setResponse(emptyResponse);
      setNotice("Evidence checked. Add your response to complete the review.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create review.");
    } finally {
      setBusy("");
    }
  }
  function requestAI() {
    setAiBusy(true);
    setAiStatus(
      "Loading the local model. First use downloads model files; your claim stays in this browser.",
    );
    setError("");
    const id = ++queryId.current;
    if (!worker.current) {
      worker.current = new Worker(new URL("./ai.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current.onmessage = (event: MessageEvent) => {
        const m = event.data;
        if (m.id !== queryId.current) return;
        if (m.progress && finishedAI.current!==m.id) {
          const p = m.progress;
          setAiStatus(
            p.status === "progress"
              ? `Loading ${p.file ?? "model"} · ${Math.round(p.progress ?? 0)}%`
              : "Preparing local embeddings…",
          );
        }
        if (m.result) {
          finishedAI.current=m.id;
          const result = m.result as LocalAI;
          setAiInfo(result);
          setAssistance({
            engine: "semantic-local",
            model: MODEL.id,
            modelRevision: MODEL.revision,
            suggestedKind: result.suggestedKind,
            confirmedByHuman: false,
            guidanceIds: result.guidanceIds,
          });
          setAiStatus(
            `384-dimensional embeddings computed locally · ${Math.round(result.milliseconds)} ms warm query inference`,
          );
          setAiBusy(false);
        }
        if (m.error) {
          finishedAI.current=m.id;
          console.warn('Local embedding inference unavailable:',m.error);
          const ids = lexicalRank(claim.text)
            .slice(0, 3)
            .map((r) => r.id);
          setAssistance({ ...none, engine: "lexical", guidanceIds: ids });
          setAiStatus(
            "Local model unavailable. Using keyword retrieval; the evidence check remains available.",
          );
          setAiBusy(false);
        }
      };
      worker.current.onerror = () => {
        setAiBusy(false);
        setAiStatus(
          "Local model could not start. Evidence checking is available without it.",
        );
      };
    }
    worker.current.postMessage({ id, query: claim.text });
  }
  function cancelAI() {
    queryId.current++;
    worker.current?.terminate();
    worker.current = undefined;
    setAiBusy(false);
    setAiStatus("Local assistance cancelled.");
  }
  function confirmSuggestion() {
    if (assistance.suggestedKind) {
      setClaim((c) => ({ ...c, kind: assistance.suggestedKind! }));
      setAssistance((a) => ({ ...a, confirmedByHuman: true }));
      setPacket(undefined);
      setNotice("Claim type confirmed. Run the evidence check.");
    }
  }
  async function finishResponse() {
    if (!packet) return;
    setError("");
    if (
      response.action === "pending" ||
      response.explanation.trim().length < 10
    ) {
      setError(
        "Choose a response and give an explanation of at least 10 characters.",
      );
      return;
    }
    if (response.action === "correct" && !response.revisedText.trim()) {
      setError("Enter the narrower or corrected statement.");
      return;
    }
    const payload = { ...packet.payload, response };
    const completed = {
      ...packet,
      payload,
      digest: await digestPayload(payload),
      receipt: null,
    };
    setPacket(completed);
    setHistory((h) => [
      ...h.filter((p) => p.payload.revision !== completed.payload.revision),
      completed,
    ]);
    setNotice("Review completed. Physical mitigation remains unassessed.");
  }
  async function verify(text = verifyInput) {
    setBusy("verify");
    setError("");
    setReport(undefined);
    try {
      const p = parsePacket(text);
      setVerifyPacketValue(p);
      setVerifyInput(JSON.stringify(p, null, 2));
      let bytes: Uint8Array | undefined;
      try {
        bytes = await getZip();
      } catch {
        /* Return NOT_ESTABLISHED if the snapshot cannot be obtained. */
      }
      const result = await verifyPacket(p, bytes);
      if (
        p.receipt &&
        ledger &&
        p.receipt.chainId === ledger.chainId &&
        p.receipt.contract.toLowerCase() === ledger.address.toLowerCase()
      )
        result.anchor = await verifyAnchor(p, ledger.rpcUrl);
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid packet.");
    } finally {
      setBusy("");
    }
  }
  async function attack() {
    const source = verifyPacketValue ?? packet;
    if (!source || !source.payload.records.length) {
      setError(
        "Load a packet with at least one matching detection to try the omission test.",
      );
      return;
    }
    const records = source.payload.records.slice(0, -1);
    const payload = {
      ...source.payload,
      records,
      finding: evaluateClaim(source.payload.claim, records),
    };
    const changed = {
      ...source,
      payload,
      digest: await digestPayload(payload),
    };
    await verify(JSON.stringify(changed));
    setNotice(
      "Adversarial copy: one record removed, result recomputed and payload rehashed. Original review unchanged.",
    );
  }
  async function loadLedger() {
    setError("");
    try {
      const r = await fetch("/ledger/local.json");
      if (!r.ok)
        throw new Error(
          "No ledger deployment configured. Core review and verification work without a wallet. For the local ledger, run npm run chain:local and npm run chain:deploy.",
        );
      const config = (await r.json()) as LedgerConfig;
      setLedger(config);
      setShowLedger(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ledger unavailable.");
    }
  }
  async function publish() {
    if (!packet || !ledger) return;
    setBusy("chain");
    setError("");
    try {
      const provider = (window as unknown as { ethereum?: EIP1193Provider })
        .ethereum;
      if (!provider)
        throw new Error(
          "A browser wallet is needed only for publishing. Install or enable an EVM wallet, then connect to the configured test network.",
        );
      const lastReceipt =
        [...history].reverse().find((p) => p.receipt)?.receipt ?? null;
      const receipt = await publishPacket(
        packet,
        ledger,
        provider,
        lastReceipt,
        setChainMessage,
      );
      const updated = { ...packet, receipt };
      setPacket(updated);
      setHistory((h) =>
        h.map((p) => (p.digest === packet.digest ? updated : p)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publication failed.");
    } finally {
      setBusy("");
    }
  }
  const selected = fixture ? selectRecords(claim, fixture.records) : [];
  const latest = fixture?.records.at(-1);
  const plotStart=new Date('2024-06-01').valueOf();
  const plotEnd=new Date('2026-07-01').valueOf();
  const position=(date:string)=>Math.max(8,Math.min(92,8+84*(new Date(date).valueOf()-plotStart)/(plotEnd-plotStart)));
  const bandStart=position(claim.start);
  const bandWidth=position(claim.end)-bandStart;
  const complete = packet && packet.payload.response.action !== "pending";
  const guidance = assistance.guidanceIds.length
    ? cards.filter((c) => assistance.guidanceIds.includes(c.id))
    : cards.filter((c) => ["coverage", "repair", "hash"].includes(c.id));
  if (fatal)
    return (
      <main className="loading-screen">
        <TriangleAlert />
        <h1>Evidence could not load</h1>
        <p>{fatal}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!fixture)
    return (
      <main className="loading-screen">
        <LoaderCircle className="spin" />
        <p>Opening the public evidence snapshot…</p>
      </main>
    );
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("review");
          }}
        >
          <span className="brand-mark">
            A<span />
          </span>
          AfterPlume
          <span className="brand-divider" />
          <span className="brand-caption">EVIDENCE DESK</span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["review", "Review desk"],
              ["verify", "Verify a packet"],
              ["method", "Method & limits"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "nav active" : "nav"}
              onClick={() => {
                setTab(value);
                setError("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <a
          className="source-link"
          href="https://github.com/kathir-iTech/AfterPlume"
          target="_blank"
          rel="noreferrer"
        >
          Open source <ArrowUpRight size={14} />
        </a>
      </header>
      <main className="page">
        <div className="breadcrumb">
          <Globe2 size={14} /> Public methane evidence{" "}
          <ChevronRight size={13} />
          <span>
            {tab === "review"
              ? "Source review"
              : tab === "verify"
                ? "Independent replay"
                : "Method & limits"}
          </span>
          <span className="snapshot-tag">
            <span className="dot" /> Snapshot · 12 OCT 2026
          </span>
        </div>
        {notice && (
          <div className="notice" role="status">
            <Info size={16} />
            <span>{notice}</span>
            <button
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            <TriangleAlert size={18} />
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {tab === "review" && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">
                  FROM A STATEMENT TO A CHECKABLE REVIEW
                </p>
                <h1>
                  Check the claim.
                  <br />
                  <span>Keep the evidence.</span>
                </h1>
                <p className="intro">
                  A detection is a record. A repair is a different claim.
                  <br className="desktop-break" /> Make the distinction
                  visible—and let someone else replay it.
                </p>
              </div>
              <div className="heading-actions">
                <button
                  className="button secondary"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <GitBranch size={16} /> Review history{" "}
                  <span className="count">{history.length}</span>
                </button>
                <button
                  className="button primary"
                  disabled={!packet}
                  onClick={() => packet && download(packet)}
                >
                  <ArrowDownToLine size={16} /> Export review
                </button>
                <p>
                  <LockKeyhole size={12} /> No account or wallet needed
                </p>
              </div>
            </section>
            <div className="demo-notice">
              <FlaskConical size={17} />
              <div>
                <strong>Real observations. Hypothetical statement.</strong>
                <span>
                  {" "}
                  This example makes no allegation about an operator. Source
                  assignment is provided by UNEP.
                </span>
              </div>
              <Pill>WORKING EXAMPLE</Pill>
            </div>
            <section className="source-summary">
              <div className="source-symbol">
                <Layers3 size={25} />
              </div>
              <div>
                <p className="eyebrow">PROVIDER SOURCE</p>
                <h2>
                  {claim.sourceId} <Pill>Oil & gas</Pill>
                </h2>
                <span>Azerbaijan · UNEP IMEO MARS</span>
              </div>
              <div className="source-stat">
                <span>Recorded observations</span>
                <strong>
                  {fixture.records.length}
                  <small>in this snapshot</small>
                </strong>
              </div>
              <div className="source-stat">
                <span>Latest acquisition</span>
                <strong>
                  {latest?.acquired.slice(0, 10)}
                  <small>provider calendar date</small>
                </strong>
              </div>
              <div className="source-coordinate">
                <Globe2 size={15} />
                <span>
                  {Number(fixture.sources[0]?.lat).toFixed(4)}° N<br />
                  {Number(fixture.sources[0]?.lon).toFixed(4)}° E
                </span>
              </div>
            </section>
            <div className="desk-grid">
              <section className="panel claim-panel">
                <div className="panel-heading">
                  <span className="step">01</span>
                  <h2>Bound the statement</h2>
                </div>
                <label className="field-label" htmlFor="claim-text">
                  Statement to review
                </label>
                <textarea
                  id="claim-text"
                  maxLength={3000}
                  value={claim.text}
                  onChange={(e) => changeClaim({ text: e.target.value })}
                />
                <div className="field-help">
                  <FlaskConical size={13} /> Hypothetical example statement
                </div>
                <button
                  className="assist-button"
                  onClick={requestAI}
                  disabled={aiBusy}
                >
                  <Sparkles size={15} />
                  {aiBusy
                    ? "Preparing local assistance…"
                    : "Suggest a claim type locally"}
                  {!aiBusy && <ArrowRight size={14} />}
                </button>
                {aiBusy && (
                  <button className="text-button" onClick={cancelAI}>
                    Cancel loading
                  </button>
                )}
                {aiStatus && (
                  <p className="ai-status" role="status">
                    {aiStatus}
                  </p>
                )}
                {aiInfo && !assistance.confirmedByHuman && (
                  <div className="suggestion">
                    <Sparkles size={16} />
                    <p>
                      Suggested type
                      <br />
                      <strong>{titles[aiInfo.suggestedKind]}</strong>
                    </p>
                    <button onClick={confirmSuggestion}>Confirm</button>
                  </div>
                )}
                <label className="field-label" htmlFor="claim-kind">
                  Confirmed claim type
                </label>
                <div className="select-wrap">
                  <select
                    id="claim-kind"
                    value={claim.kind}
                    onChange={(e) =>
                      changeClaim({ kind: e.target.value as Claim["kind"] })
                    }
                  >
                    {Object.entries(titles).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
                <p className="field-help">
                  You choose the type. AI never decides the finding.
                </p>
                <label className="field-label" htmlFor="source-id">
                  Exact provider source ID
                </label>
                <input
                  id="source-id"
                  value={claim.sourceId}
                  onChange={(e) => changeClaim({ sourceId: e.target.value })}
                />
                <div className="date-grid">
                  <div>
                    <label className="field-label" htmlFor="start">
                      {claim.kind==='repair_occurred'?'Repair date · included':'Start · included'}
                    </label>
                    <input
                      id="start"
                      type="date"
                      value={claim.start}
                      onChange={(e) => changeClaim({ start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="end">
                      End · excluded
                    </label>
                    <input
                      id="end"
                      type="date"
                      value={claim.end}
                      onChange={(e) => changeClaim({ end: e.target.value })}
                    />
                  </div>
                </div>
                <p className="calendar-note">
                  <Clock3 size={13} /> Provider calendar dates. No timezone
                  conversion.
                </p>
                <button
                  className="button primary full"
                  disabled={!!busy || !assistance.confirmedByHuman}
                  onClick={runReview}
                >
                  {busy === "review" ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Search size={17} />
                  )}{" "}
                  Run evidence check <ArrowRight size={15} />
                </button>
                {!assistance.confirmedByHuman && (
                  <button
                    className="text-button"
                    onClick={() =>
                      setAssistance((a) => ({ ...a, confirmedByHuman: true }))
                    }
                  >
                    Keep my selected type
                  </button>
                )}
              </section>
              <section className="panel evidence-panel">
                <div className="panel-heading">
                  <span className="step">02</span>
                  <h2>Follow the observations</h2>
                  <Pill>{selected.length} IN INTERVAL</Pill>
                </div>
                <div className="evidence-caption">
                  <span className="small-dot red" /> Selected interval
                </div>
                <div
                  className="timeline-chart"
                  aria-label="Observation timeline from July 2024 to June 2026"
                >
                  <div className="chart-grid" />
                  {bandWidth>0&&<div className="interval-band" style={{left:`${bandStart}%`,width:`${bandWidth}%`,right:'auto'}}/>}
                  <div className="chart-axis" />
                  {fixture.records.map((r) => {
                    const start = new Date("2024-06-01").valueOf();
                    const end = new Date("2026-07-01").valueOf();
                    const x =
                      8 +
                      (84 *
                        (new Date(r.acquired.slice(0, 10)).valueOf() - start)) /
                        (end - start);
                    const match = selected.some((s) => s.id === r.id);
                    return (
                      <button
                        key={r.id}
                        className={"plume-dot " + (match ? "selected" : "")}
                        style={{
                          left: `${x}%`,
                          bottom: `${26 + (Math.min(Number(r.rate) || 200, 4500) / 4500) * 62}%`,
                        }}
                        title={`${r.acquired.slice(0, 10)} · ${r.rate || "unquantified"} kg/h`}
                        aria-label={`View ${r.acquired.slice(0, 10)} ${r.satellite} record`}
                        onClick={() =>
                          setExpanded(expanded === r.id ? undefined : r.id)
                        }
                      />
                    );
                  })}
                  <span className="chart-label start">JUL 2024</span>
                  <span className="chart-label mid">JUN 2025</span>
                  <span className="chart-label end">JUN 2026</span>
                  <span className="chart-unit">
                    kg/h · instantaneous estimate
                  </span>
                </div>
                <div className="records-title">
                  <h3>Detection records</h3>
                  <span>All sensors · source assigned</span>
                </div>
                <div className="record-list">
                  {fixture.records.map((r) => {
                    const match = selected.some((s) => s.id === r.id);
                    return (
                      <div
                        key={r.id}
                        className={
                          "record-item " + (match ? "in-interval" : "")
                        }
                      >
                        <button
                          className="record-summary"
                          onClick={() =>
                            setExpanded(expanded === r.id ? undefined : r.id)
                          }
                          aria-expanded={expanded === r.id}
                        >
                          <span
                            className={"record-dot " + (match ? "red" : "")}
                          />
                          <span className="record-date">
                            {r.acquired.slice(0, 10)}
                            <small>{r.satellite.split(" - ")[0]}</small>
                          </span>
                          <span className="record-rate">
                            {r.rate
                              ? Number(r.rate).toLocaleString("en-US")
                              : "Not quantified"}
                            <small>
                              {r.rate ? "kg/h" : "positive detection"}
                            </small>
                          </span>
                          <ChevronDown size={14} />
                        </button>
                        {expanded === r.id && (
                          <div className="record-detail">
                            <dl>
                              <dt>Provider UUID</dt>
                              <dd>{r.id}</dd>
                              <dt>Original acquisition string</dt>
                              <dd>{r.acquired}</dd>
                              <dt>Reported standard deviation</dt>
                              <dd>
                                {r.std ? `${r.std} kg/h` : "Not reported"}
                              </dd>
                              <dt>Detection institution</dt>
                              <dd>{r.raw.detection_institution}</dd>
                              <dt>Source assignment</dt>
                              <dd>{r.sourceId}</dd>
                            </dl>
                            <a
                              href="https://methanedata.unep.org/dict-mars-plumes"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Field definitions <ArrowUpRight size={12} />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="evidence-footnote">
                  <Info size={15} />
                  <p>
                    Rates are instantaneous estimates. A record without a rate
                    still counts as a detection.
                  </p>
                </div>
              </section>
              <section className="panel finding-panel">
                <div className="panel-heading">
                  <span className="step">03</span>
                  <h2>Review the finding</h2>
                </div>
                {packet ? (
                  <>
                    <div
                      className={
                        "finding-box " +
                        (packet.payload.finding.status === "DETECTION_RECORDED"
                          ? "conflict"
                          : "caution")
                      }
                    >
                      <div className="finding-icon">
                        <TriangleAlert size={23} />
                      </div>
                      <p className="eyebrow">EVIDENCE FINDING</p>
                      <h3>{findingTitle[packet.payload.finding.status]}</h3>
                      <p>{packet.payload.finding.reason}</p>
                      <Pill
                        tone={
                          packet.payload.finding.status === "DETECTION_RECORDED"
                            ? "red"
                            : "amber"
                        }
                      >
                        {packet.payload.records.length} matching record
                        {packet.payload.records.length === 1 ? "" : "s"}
                      </Pill>
                    </div>
                    <div className="status-row">
                      <span>Review status</span>
                      <strong>
                        {complete ? "Completed" : "Awaiting your response"}
                      </strong>
                    </div>
                    <div className="status-row">
                      <span>Physical mitigation</span>
                      <Pill tone="amber">Not assessed</Pill>
                    </div>
                    <div className="status-row">
                      <span>Observation coverage</span>
                      <strong>Insufficient for cessation</strong>
                    </div>
                    <div className="policy-stamp">
                      <FileCheck2 size={15} />
                      <span>
                        Deterministic policy · v1.0.0
                        <br />
                        <small>All source-matching records checked</small>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="finding-empty">
                    <FileCheck2 size={37} strokeWidth={1.2} />
                    <h3>The evidence gets a say.</h3>
                    <p>
                      Run the check to see what these records establish—and what
                      they leave open.
                    </p>
                  </div>
                )}
                <div className="limits-note">
                  <Info size={16} />
                  <div>
                    <strong>Keep this limit visible</strong>
                    <p>
                      No matching records is not proof of zero emissions. The
                      snapshot has no complete negative-observation history.
                    </p>
                  </div>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("method")}
                >
                  Read the method & limitations <ArrowUpRight size={13} />
                </button>
              </section>
            </div>
            {packet && (
              <section className="panel response-panel">
                <div className="response-heading">
                  <div className="panel-heading">
                    <span className="step">04</span>
                    <h2>Respond to the evidence</h2>
                  </div>
                  <Pill tone={complete ? "teal" : "neutral"}>
                    {complete ? "REVIEW COMPLETED" : "HUMAN DECISION"}
                  </Pill>
                </div>
                {complete ? (
                  <div className="completed-response">
                    <Check size={20} />
                    <div>
                      <strong>
                        {packet.payload.response.action === "correct"
                          ? "Statement corrected or narrowed"
                          : packet.payload.response.action === "withdraw"
                            ? "Statement withdrawn"
                            : "Statement retained with explanation"}
                      </strong>
                      <p>{packet.payload.response.explanation}</p>
                      {packet.payload.response.revisedText && (
                        <blockquote>
                          {packet.payload.response.revisedText}
                        </blockquote>
                      )}
                      <span className="field-help">
                        Original statement and conflicting evidence remain in
                        the packet.
                      </span>
                    </div>
                    <button className="button secondary" onClick={runReview}>
                      <Plus size={15} /> Start next revision
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="response-options">
                      {(
                        [
                          [
                            "correct",
                            "Correct or narrow",
                            "Keep only what the evidence supports.",
                          ],
                          [
                            "retain",
                            "Retain with explanation",
                            "Preserve the conflict and explain your reasoning.",
                          ],
                          [
                            "withdraw",
                            "Withdraw the statement",
                            "Keep the evidence and the withdrawal visible.",
                          ],
                        ] as const
                      ).map(([action, title, sub]) => (
                        <label
                          key={action}
                          className={
                            "response-option " +
                            (response.action === action ? "chosen" : "")
                          }
                        >
                          <input
                            type="radio"
                            name="response"
                            checked={response.action === action}
                            onChange={() =>
                              setResponse((r) => ({ ...r, action }))
                            }
                          />
                          <span>
                            <strong>{title}</strong>
                            <small>{sub}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="response-fields">
                      <div>
                        <label className="field-label" htmlFor="response">
                          Your explanation
                        </label>
                        <textarea
                          id="response"
                          placeholder="What does the evidence change, and what still needs follow-up?"
                          value={response.explanation}
                          maxLength={5000}
                          onChange={(e) =>
                            setResponse((r) => ({
                              ...r,
                              explanation: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {response.action === "correct" && (
                        <div>
                          <label className="field-label" htmlFor="corrected">
                            Corrected statement
                          </label>
                          <textarea
                            id="corrected"
                            placeholder="Detections are recorded in this interval. The repair and subsequent mitigation require field verification."
                            value={response.revisedText}
                            maxLength={3000}
                            onChange={(e) =>
                              setResponse((r) => ({
                                ...r,
                                revisedText: e.target.value,
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="response-bottom">
                      <p>
                        <ShieldCheck size={15} /> Completing a review does not
                        certify mitigation.
                      </p>
                      <button
                        className="button primary"
                        onClick={finishResponse}
                      >
                        <Check size={16} /> Complete this review
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
            <div className="below-grid">
              <section className="panel guidance-panel">
                <div className="panel-heading">
                  <Sparkles size={17} />
                  <h2>Evidence guidance</h2>
                  <Pill>
                    {assistance.engine === "semantic-local"
                      ? "LOCAL AI + KEYWORDS"
                      : "REFERENCE NOTES"}
                  </Pill>
                </div>
                <div className="guidance-grid">
                  {guidance.map((c) => (
                    <article key={c.id}>
                      <h3>{c.title}</h3>
                      <p>{c.text}</p>
                      <a href={c.url} target="_blank" rel="noreferrer">
                        Source & context <ArrowUpRight size={12} />
                      </a>
                    </article>
                  ))}
                </div>
                <p className="guidance-disclosure">
                  Guidance text is authored and cited. The local model ranks
                  notes and suggests a claim type; the evidence finding follows
                  fixed rules.
                </p>
              </section>
              <section className="panel portable-panel">
                <span className="portable-icon">
                  <FileJson size={27} />
                </span>
                <h2>A review you can hand over.</h2>
                <p>
                  Export the statement, source records, policy, finding and
                  human response. Recompute the result outside this app.
                </p>
                <button
                  className="button secondary full"
                  disabled={!packet}
                  onClick={() => {
                    if (packet) {
                      const text = JSON.stringify(packet, null, 2);
                      setVerifyInput(text);
                      setTab("verify");
                      void verify(text);
                    }
                  }}
                >
                  Replay this review <ArrowRight size={16} />
                </button>
                <button className="text-button" onClick={loadLedger}>
                  Optional blockchain publication <ArrowUpRight size={13} />
                </button>
              </section>
            </div>
            {showHistory && (
              <section className="panel history-panel">
                <div className="panel-heading">
                  <GitBranch size={18} />
                  <h2>Local revision history</h2>
                  <button
                    className="icon-button"
                    onClick={() => setShowHistory(false)}
                    aria-label="Close history"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p>
                  Stored on this browser. Export reviews for portability. Prior
                  acknowledgements apply to their original revisions.
                </p>
                {!history.length ? (
                  <p>No completed reviews yet.</p>
                ) : (
                  history.map((p, i) => (
                    <div className="history-row" key={p.digest}>
                      <strong>r{p.payload.revision}</strong>
                      <span>
                        {p.payload.response.action}
                        <small>{short(p.digest)}</small>
                      </span>
                      <Pill
                        tone={i === history.length - 1 ? "teal" : "neutral"}
                      >
                        {i === history.length - 1
                          ? "Latest local"
                          : "Superseded locally"}
                      </Pill>
                      <span>
                        {p.receipt ? "Commitment attached" : "Unpublished"}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => download(p)}
                      >
                        Export
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          setTab("verify");
                          void verify(JSON.stringify(p));
                        }}
                      >
                        Verify
                      </button>
                    </div>
                  ))
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    localStorage.removeItem("afterplume-history-v1");
                    setHistory([]);
                    setPacket(undefined);
                    setNotice(
                      "Local history cleared. Downloaded packets and blockchain history are preserved.",
                    );
                  }}
                >
                  Clear this browser’s history
                </button>
              </section>
            )}
          </>
        )}
        {tab === "verify" && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">TRUST THE CHECK, NOT THE SCREENSHOT</p>
                <h1>Replay the review.</h1>
                <p className="intro">
                  A valid hash can hide an omitted record.
                  <br />
                  Check the file, the full source snapshot and the external
                  commitment separately.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} /> Import review packet
              </button>
            </section>
            <div className="verify-grid">
              <section className="panel">
                <div className="panel-heading">
                  <FileJson size={18} />
                  <h2>Review packet</h2>
                </div>
                <input
                  ref={fileRef}
                  className="visually-hidden"
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 12_000_000) {
                      setError("Packet exceeds 12 MB.");
                      return;
                    }
                    setVerifyInput(await f.text());
                    setReport(undefined);
                  }}
                />
                <label className="field-label" htmlFor="packet-json">
                  Paste exported JSON or import a file
                </label>
                <textarea
                  className="json-input"
                  id="packet-json"
                  value={verifyInput}
                  onChange={(e) => {
                    setVerifyInput(e.target.value);
                    setReport(undefined);
                  }}
                  placeholder={'{\n  "payload": { ... },\n  "digest": "..."\n}'}
                />
                <button
                  className="button primary full"
                  disabled={!verifyInput || !!busy}
                  onClick={() => verify()}
                >
                  {busy === "verify" ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}{" "}
                  Verify against full snapshot
                </button>
                <p className="field-help">
                  The first check loads the pinned 10.8 MB source ZIP. Imported
                  links are never fetched.
                </p>
                <label className="snapshot-upload">
                  <Upload size={14} /> Supply the pinned snapshot ZIP
                  <input
                    type="file"
                    accept=".zip"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (f.size > 20_000_000) {
                        setError("Snapshot exceeds 20 MB.");
                        return;
                      }
                      zip.current = new Uint8Array(await f.arrayBuffer());
                      setReport(undefined);
                      setNotice(
                        "Snapshot supplied. Its SHA-256 will be checked before any ZIP member is unpacked.",
                      );
                    }}
                  />
                </label>
              </section>
              <section className="panel verification-results">
                <div className="panel-heading">
                  <ShieldCheck size={18} />
                  <h2>Three separate checks</h2>
                </div>
                {report ? (
                  <>
                    <CheckRow
                      label="1. Packet integrity"
                      check={report.integrity}
                    />
                    <CheckRow
                      label="2. Source inclusion & replay"
                      check={report.snapshot}
                    />
                    <CheckRow
                      label="3. External commitment"
                      check={report.anchor}
                    />
                    <div className="verification-summary">
                      <Info size={16} />
                      <p>
                        A source match establishes completeness within the
                        pinned snapshot. Neither this verifier nor a blockchain
                        record certifies physical mitigation.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="finding-empty">
                    <ShieldCheck size={43} strokeWidth={1.1} />
                    <h3>Bring your own packet.</h3>
                    <p>
                      The verifier reconstructs the source selection and
                      finding. No account or author’s app state is required.
                    </p>
                  </div>
                )}
                <div className="attack-card">
                  <FlaskConical size={20} />
                  <div>
                    <h3>Try a harder edit</h3>
                    <p>
                      Remove a matching record, recompute the result and rehash
                      the file. Integrity can pass. Source inclusion should
                      fail.
                    </p>
                    <button
                      className="button secondary"
                      disabled={
                        !!busy ||
                        !(verifyPacketValue ?? packet)?.payload.records.length
                      }
                      onClick={attack}
                    >
                      Omit a record & rehash <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
            <div className="cli-note">
              <FileCheck2 size={18} />
              <div>
                <strong>Replay outside the browser</strong>
                <code>
                  npm run verify -- review.json
                  apps/web/public/data/mars-snapshot.zip
                </code>
                <span>
                  The CLI is a separate entry point using the same documented
                  evidence policy.
                </span>
              </div>
            </div>
          </>
        )}
        {tab === "method" && (
          <>
            <section className="page-heading">
              <div>
                <p className="eyebrow">A SMALL CLAIM. VISIBLE LIMITS.</p>
                <h1>What this review establishes.</h1>
                <p className="intro">
                  Evidence, inference and acknowledgement have different
                  meanings.
                </p>
              </div>
            </section>
            <div className="method-grid">
              <section className="panel">
                <h2>The evidence policy</h2>
                <ol>
                  <li>Match the exact provider source ID.</li>
                  <li>
                    Select every detection within the start-inclusive,
                    end-exclusive provider calendar dates.
                  </li>
                  <li>Keep all sensors and records with missing rates.</li>
                  <li>
                    Apply fixed, versioned rules for the confirmed claim type.
                  </li>
                  <li>
                    Preserve the human response without deleting the original
                    claim.
                  </li>
                </ol>
                <h3>What remains unassessed</h3>
                <p>
                  Physical repair, facility ownership, sustained cessation,
                  regulatory compliance and a percentage emissions reduction. A
                  later plume requires follow-up; it does not prove a repair did
                  not happen.
                </p>
              </section>
              <section className="panel">
                <h2>Public source and attribution</h2>
                <p>
                  UNEP IMEO MARS. Pinned download captured on 12 October 2026:{" "}
                  {fixture.manifest.recordCount.toLocaleString("en-US")} plume
                  rows and{" "}
                  {fixture.manifest.sourceCount.toLocaleString("en-US")}{" "}
                  sources.
                </p>
                <p>
                  This is detection-only data. No complete negative-observation
                  or overpass denominator is available. Some records have no
                  source assignment or quantified rate.
                </p>
                <a
                  href="https://methanedata.unep.org/download-dataset"
                  target="_blank"
                  rel="noreferrer"
                >
                  Provider download <ArrowUpRight size={13} />
                </a>
                <h3>Data license notices differ</h3>
                <p>
                  The download dictionary states CC BY-NC-SA 4.0; general terms
                  state CC BY-NC 4.0. This noncommercial demo preserves
                  attribution and share-alike terms for adapted fixtures. Code
                  is MIT; model is Apache-2.0.
                </p>
                <a
                  href="https://methanedata.unep.org/dict-mars-plumes"
                  target="_blank"
                  rel="noreferrer"
                >
                  Dictionary
                </a>{" "}
                ·{" "}
                <a
                  href="https://methanedata.unep.org/terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                >
                  Provider terms
                </a>
              </section>
              <section className="panel">
                <h2>Local AI, bounded responsibility</h2>
                <p>
                  {MODEL.id} computes sentence embeddings in a browser worker.
                  Hybrid semantic and keyword ranking retrieves authored, cited
                  guidance. You confirm the claim type.
                </p>
                <p>
                  Inference stays on your device. The initial model download
                  needs a connection; cached files may work offline. Errors fall
                  back to keyword retrieval. The fixed evidence finding does not
                  depend on the model.
                </p>
                <h3>Packet protocol</h3>
                <p>
                  Strict JSON schema, RFC 8785 canonicalization and SHA-256. The
                  digest excludes the receipt to avoid a circular hash.
                  Duplicate keys and non-finite numbers are rejected.
                </p>
              </section>
              <section className="panel">
                <h2>Blockchain scope</h2>
                <p>
                  The registry records owner-submitted digests, sequential
                  revisions, explicit reviewer authorization, acknowledgement
                  and terminal withdrawal. Reviewers are addresses, not
                  certified auditors.
                </p>
                <p>
                  A prior revision’s acknowledgement remains historical when a
                  new revision is published. A local development chain is
                  resettable; it is never shown as a durable public anchor.
                </p>
                <h3>No scientific signature</h3>
                <p>
                  The provider ZIP is downloaded over HTTPS and pinned by hash.
                  UNEP has not cryptographically signed this packet. A ledger
                  commitment does not establish the truth of a claim or the
                  honesty of a reviewer.
                </p>
              </section>
            </div>
          </>
        )}
        {showLedger && ledger && (
          <>
            <LedgerPanel
              config={ledger}
              packet={packet}
              busy={busy === "chain"}
              publish={publish}
              onClose={() => setShowLedger(false)}
              onError={setError}
            />
            {chainMessage && (
              <p className="chain-message" role="status">
                {chainMessage}
              </p>
            )}
          </>
        )}
        <footer>
          <div>
            <span className="footer-brand">AfterPlume</span>
            <span>Evidence before assurance.</span>
          </div>
          <span>UNEP public data · Noncommercial research prototype</span>
          <a
            href="https://github.com/kathir-iTech/AfterPlume"
            target="_blank"
            rel="noreferrer"
          >
            Source & reproducibility <ArrowUpRight size={12} />
          </a>
        </footer>
      </main>
    </>
  );
}
