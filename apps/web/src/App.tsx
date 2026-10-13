import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileCheck2,
  FileJson,
  FlaskConical,
  Globe2,
  Info,
  LoaderCircle,
  ShieldCheck,
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
} from "../../../packages/core/index.ts";
import {
  cards,
  lexicalRank,
  suggestLexicalKind,
} from "../../../packages/retrieval/index.ts";
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

import Observatory from "./Observatory.tsx";
import ProofTour from "./ProofTour.tsx";
import ReviewDesk from "./ReviewDesk.tsx";
import { CheckRow } from "./Checks.tsx";
import { type Fixture, type Assistance, type LocalAI } from "./ui-data.ts";
import MethodView from "./MethodView.tsx";
import LedgerEvidence from "./LedgerEvidence.tsx";
import useSnapshot from "./useSnapshot.ts";
import type { Source, SourceIndex } from "./explorer-types.ts";

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
function routeTab(): "explore" | "proof" | "review" | "verify" | "method" {
  const route = location.pathname.slice(1);
  return ["proof", "review", "verify", "method"].includes(route)
    ? (route as "proof" | "review" | "verify" | "method")
    : "explore";
}
function historyPush(path: string) {
  window.history.pushState(null, "", path);
}
export default function App() {
  const [fixture, setFixture] = useState<Fixture>();
  const [fatal, setFatal] = useState("");
  const [claim, setClaim] = useState<Claim>(initialClaim);
  const [packet, setPacket] = useState<Packet>();
  const [history, setHistory] = useState<Packet[]>([]);
  const [response, setResponse] = useState<HumanResponse>(emptyResponse);
  const [tab, setTab] = useState<
    "explore" | "proof" | "review" | "verify" | "method"
  >(() => routeTab());
  const [index, setIndex] = useState<SourceIndex>();
  const [showLedgerEvidence, setShowLedgerEvidence] = useState(false);
  const snapshot = useSnapshot();
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
  const finishedAI = useRef<number | null>(null);
  const zip = useRef<Uint8Array | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const sourceRequest = useRef(0);
  function navigate(value: typeof tab) {
    setTab(value);
    setError("");
    setNotice("");
    historyPush(value === "explore" ? "/" : `/${value}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const pop = () => {
      setTab(routeTab());
      setError("");
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    let live = true;
    fetch("/data/source-index.json")
      .then((r) => {
        if (!r.ok) throw new Error("Source catalogue unavailable.");
        return r.json();
      })
      .then((d) => {
        if (live) setIndex(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function openSource(source: Source, start?: string, end?: string) {
    const request = ++sourceRequest.current;
    setBusy("source");
    setError("");
    try {
      const records = await snapshot.sourceRecords(source.id);
      if (request !== sourceRequest.current) return;
      const nextStart =
        start ??
        (source.id === initialClaim.sourceId
          ? initialClaim.start
          : source.latest || initialClaim.start);
      const nextEnd =
        end ??
        (source.id === initialClaim.sourceId
          ? initialClaim.end
          : new Date(Date.parse(nextStart) + 86400000)
              .toISOString()
              .slice(0, 10));
      setFixture({
        manifest: index?.manifest ?? fixture!.manifest,
        sources: [
          {
            source_name: source.id,
            country: source.country,
            sector: source.sector,
            lat: source.lat,
            lon: source.lon,
          },
        ],
        records,
      });
      changeClaim({
        sourceId: source.id,
        start: nextStart,
        end: nextEnd,
        text: `No methane detections were recorded for source ${source.id} from ${nextStart} included to ${nextEnd} excluded.`,
        kind: "no_detections",
      });
      navigate("review");
    } catch (e) {
      if (request === sourceRequest.current)
        setError(
          e instanceof Error ? e.message : "Source could not be opened.",
        );
    } finally {
      if (request === sourceRequest.current) setBusy("");
    }
  }
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
      let records = fixture.records;
      if (fixture.sources[0]?.source_name !== claim.sourceId) {
        records = await snapshot.sourceRecords(claim.sourceId);
        const source = index?.sources.find((s) => s.id === claim.sourceId);
        if (source)
          setFixture({
            manifest: fixture.manifest,
            sources: [
              {
                source_name: source.id,
                country: source.country,
                sector: source.sector,
                lat: source.lat,
                lon: source.lon,
              },
            ],
            records,
          });
      }
      const previous = history
        .filter((p) => p.payload.claim.sourceId === claim.sourceId)
        .at(-1);
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
        records,
        index
          ? index.sources.some((s) => s.id === claim.sourceId)
          : fixture.sources.some((s) => s.source_name === claim.sourceId),
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
    setAssistance({
      ...none,
      engine: "lexical",
      suggestedKind: suggestLexicalKind(claim.text),
      confirmedByHuman: false,
      guidanceIds: lexicalRank(claim.text)
        .slice(0, 3)
        .map((r) => r.id),
    });
    setAiBusy(true);
    setAiStatus(
      "Instant keyword suggestion ready. Local semantics loads in the background; you can confirm now.",
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
        if (m.progress && finishedAI.current !== m.id) {
          const p = m.progress;
          setAiStatus(
            p.status === "progress"
              ? `Loading ${p.file ?? "model"} · ${Math.round(p.progress ?? 0)}%`
              : "Preparing local embeddings…",
          );
        }
        if (m.result) {
          finishedAI.current = m.id;
          const result = m.result as LocalAI;
          setAiInfo(result);
          setAssistance((previous) =>
            previous.confirmedByHuman
              ? previous
              : {
                  engine: "semantic-local",
                  model: MODEL.id,
                  modelRevision: MODEL.revision,
                  suggestedKind: result.suggestedKind,
                  confirmedByHuman: false,
                  guidanceIds: result.guidanceIds,
                },
          );
          setAiStatus(
            `384-dimensional embeddings computed locally · ${Math.round(result.milliseconds)} ms warm query inference`,
          );
          setAiBusy(false);
        }
        if (m.error) {
          finishedAI.current = m.id;
          console.warn("Local embedding inference unavailable:", m.error);
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
      ...h.filter(
        (p) =>
          p.payload.revision !== completed.payload.revision ||
          p.payload.claim.sourceId !== completed.payload.claim.sourceId,
      ),
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
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) {
      setShowLedgerEvidence(true);
      setTimeout(
        () =>
          document
            .querySelector(".ledger-evidence")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
      return;
    }
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
      setShowLedgerEvidence(true);
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
        [...history]
          .reverse()
          .find(
            (p) =>
              p.receipt &&
              p.payload.claim.sourceId === packet.payload.claim.sourceId,
          )?.receipt ?? null;
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
            navigate("explore");
          }}
        >
          <span className="brand-mark">
            A<span />
          </span>
          AfterPlume
          <span className="brand-divider" />
          <span className="brand-caption">EVIDENCE OBSERVATORY</span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["explore", "Explore"],
              ["proof", "Proof lab"],
              ["review", "Review desk"],
              ["verify", "Verify a packet"],
              ["method", "Method & limits"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "nav active" : "nav"}
              onClick={() => {
                navigate(value);
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
            {tab === "explore"
              ? "Source explorer"
              : tab === "proof"
                ? "Proof lab"
                : tab === "review"
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
        {tab === "explore" && (
          <Observatory
            index={index}
            openSource={(source, start, end) =>
              void openSource(source, start, end)
            }
            watchProof={() => navigate("proof")}
            runBatch={snapshot.batch}
            busy={busy === "source"}
          />
        )}
        {tab === "proof" && (
          <ProofTour
            getZip={getZip}
            openReview={() => {
              const source = index?.sources.find(
                (s) => s.id === initialClaim.sourceId,
              );
              if (source) void openSource(source);
              else navigate("review");
            }}
            openLedger={() => {
              setShowLedgerEvidence(true);
              setTimeout(
                () =>
                  document
                    .querySelector(".ledger-evidence")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                0,
              );
            }}
          />
        )}
        {tab === "review" && (
          <ReviewDesk
            setVerifyInput={setVerifyInput}
            claim={claim}
            packet={packet}
            history={history}
            response={response}
            assistance={assistance}
            busy={busy}
            aiBusy={aiBusy}
            aiStatus={aiStatus}
            expanded={expanded}
            fixture={fixture}
            selected={selected}
            latest={latest}
            complete={complete}
            guidance={guidance}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            changeClaim={changeClaim}
            requestAI={requestAI}
            cancelAI={cancelAI}
            confirmSuggestion={confirmSuggestion}
            setAssistance={setAssistance}
            runReview={runReview}
            setExpanded={setExpanded}
            navigate={navigate}
            finishResponse={finishResponse}
            setResponse={setResponse}
            loadLedger={loadLedger}
            verify={verify}
            setHistory={setHistory}
            setPacket={setPacket}
            setNotice={setNotice}
          />
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
            <div className="packaged-example">
              <div>
                <h2>Start with a working example.</h2>
                <p>
                  No JSON to paste. Load the original review, or run the guided
                  omission test.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={async () => {
                  try {
                    const r = await fetch("/data/example-review.json");
                    if (!r.ok) throw new Error("Example unavailable.");
                    await verify(await r.text());
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Example unavailable.",
                    );
                  }
                }}
              >
                Load example & verify
              </button>
              <button
                className="button primary"
                onClick={() => navigate("proof")}
              >
                Watch the omission test <ArrowRight size={16} />
              </button>
            </div>
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
        {tab === "method" && <MethodView manifest={fixture.manifest} />}
        {showLedgerEvidence && (
          <LedgerEvidence onClose={() => setShowLedgerEvidence(false)} />
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
