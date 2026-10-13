import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  FileCheck2,
  FileJson,
  FlaskConical,
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
import type { LedgerConfig } from "../../../packages/core/ledger.ts";
import type { EIP1193Provider } from "viem";
const LedgerPanel = lazy(() => import("./LedgerPanel.tsx"));

import Home from "./Home.tsx";
const About = lazy(() => import("./About.tsx"));
import { routeView, type View } from "./routes.ts";
const Observatory = lazy(() => import("./Observatory.tsx"));
const ProofTour = lazy(() => import("./ProofTour.tsx"));
const ReviewDesk = lazy(() => import("./ReviewDesk.tsx"));
import { CheckRow } from "./Checks.tsx";
import { fetchKnownSnapshot } from "../../../packages/core/transport.ts";
import { type Fixture, type Assistance, type LocalAI } from "./ui-data.ts";
const MethodView = lazy(() => import("./MethodView.tsx"));
const LedgerEvidence = lazy(() => import("./LedgerEvidence.tsx"));
import useSnapshot from "./useSnapshot.ts";
import {
  WORKSPACE_KEY,
  DRAFTS_KEY,
  readBrowserWorkspace,
  readBrowserDrafts,
  isDraft,
  type Workspace,
} from "./workspace.ts";
const Reviews = lazy(() => import("./Reviews.tsx"));
import type { Source, SourceIndex } from "./explorer-types.ts";

const initialClaim: Claim = {
  text: "No methane detections were recorded for source AZE_S_010 between 1 May and 1 June 2026 inclusive.",
  kind: "no_detections",
  sourceId: "AZE_S_010",
  start: "2026-05-01",
  end: "2026-06-02",
  hypothetical: true,
  reference: "",
  timeBasis: "provider-calendar-date",
};
const blankClaim: Claim = {
  text: "",
  sourceId: "",
  start: "",
  end: "",
  kind: "no_detections",
  hypothetical: false,
  reference: "",
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
function historyPush(path: string) {
  window.history.pushState(null, "", path);
}
export default function App() {
  const [fixture, setFixture] = useState<Fixture>();
  const [fatal, setFatal] = useState("");
  const [restored] = useState(readBrowserWorkspace);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Opening workspace…");
  const [savedDraft, setSavedDraft] = useState<Workspace | undefined>(restored);
  const [drafts, setDrafts] = useState<Workspace[]>(readBrowserDrafts);
  const [claim, setClaim] = useState<Claim>(restored?.claim ?? blankClaim);
  const [packet, setPacket] = useState<Packet>();
  const [history, setHistory] = useState<Packet[]>([]);
  const [response, setResponse] = useState<HumanResponse>(
    restored?.response ?? emptyResponse,
  );
  const [tab, setTab] = useState<View>(() => routeView());
  const [index, setIndex] = useState<SourceIndex>();
  const indexValue = useRef<SourceIndex | undefined>(undefined);
  const [showLedgerEvidence, setShowLedgerEvidence] = useState(false);
  const snapshot = useSnapshot();
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [assistance, setAssistance] = useState<Assistance>(
    restored?.assistance ?? none,
  );
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
  const reviewRequest = useRef(0);
  const verifyRequest = useRef(0);
  const example = useRef<Fixture | undefined>(undefined);
  const moreMenu = useRef<HTMLDetailsElement>(null);
  function navigate(value: View) {
    moreMenu.current?.removeAttribute("open");
    setTab(value);
    setError("");
    setNotice("");
    historyPush(value === "home" ? "/" : `/${value}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const pop = () => {
      setTab(routeView());
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
        if (live) {
          indexValue.current = d;
          setIndex(d);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  async function openSource(
    source: Source,
    start?: string,
    end?: string,
    practice = false,
  ) {
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
      archiveCurrentDraft();
      changeClaim({
        ...blankClaim,
        sourceId: source.id,
        start: nextStart,
        end: nextEnd,
        text: practice ? initialClaim.text : "",
        hypothetical: practice,
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
        if (live) {
          example.current = d;
          setFixture(d);
          if (restored)
            void restoreWorkspace(restored, d).finally(() => {
              if (live) setWorkspaceReady(true);
            });
          else setWorkspaceReady(true);
        }
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
  useEffect(() => {
    if (!workspaceReady) return;
    if (!claim.sourceId && !claim.text) {
      try {
        localStorage.removeItem(WORKSPACE_KEY);
        setSavedDraft(undefined);
        setStorageStatus("Saved on this device");
      } catch {
        setStorageStatus("Storage unavailable · export to keep your work");
      }
      return;
    }
    const saved: Workspace = {
      claim,
      response,
      assistance,
      packet: packet ?? null,
      updated: new Date().toISOString(),
    };
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(saved));
      setSavedDraft(saved);
      setStorageStatus("Saved on this device");
    } catch {
      setStorageStatus("Storage unavailable · export to keep your work");
    }
  }, [claim, response, assistance, packet, workspaceReady]);
  async function restoreWorkspace(saved: Workspace, base = fixture) {
    const request = ++reviewRequest.current;
    setBusy("restore");
    setError("");
    try {
      if (!base) return;
      const id = saved.claim.sourceId;
      const records = id ? await snapshot.sourceRecords(id) : base.records;
      if (request !== reviewRequest.current) return;
      const source = indexValue.current?.sources.find((s) => s.id === id);
      setFixture({
        manifest: base.manifest,
        records,
        sources: id
          ? [
              {
                source_name: id,
                country:
                  source?.country ?? records[0]?.raw.country ?? "Not reported",
                sector:
                  source?.sector ?? records[0]?.raw.sector ?? "Not reported",
                lat: source?.lat ?? "",
                lon: source?.lon ?? "",
              },
            ]
          : base.sources,
      });
      setClaim(saved.claim);
      setResponse(saved.response);
      setAssistance(saved.assistance);
      setPacket(undefined);
      if (saved.packet) {
        const checked = await verifyPacket(saved.packet, await getZip());
        if (request !== reviewRequest.current) return;
        if (
          checked.integrity.status !== "MATCH" ||
          checked.snapshot.status !== "MATCH"
        )
          throw new Error(
            "Saved evidence could not be verified. Your inputs are restored; run a fresh check.",
          );
        if (
          JSON.stringify(saved.packet.payload.claim) !==
          JSON.stringify(saved.claim)
        )
          throw new Error("Saved inputs changed. Run a fresh evidence check.");
        setPacket(saved.packet);
      }
    } catch (e) {
      if (request === reviewRequest.current)
        setError(e instanceof Error ? e.message : "Could not restore review.");
    } finally {
      if (request === reviewRequest.current) setBusy("");
    }
  }
  function startNewReview() {
    archiveCurrentDraft();
    changeClaim(blankClaim);
    navigate("explore");
  }
  function loadExample() {
    archiveCurrentDraft();
    changeClaim(initialClaim);
    if (example.current) setFixture(example.current);
    navigate("review");
  }
  function archiveCurrentDraft() {
    if (
      !savedDraft ||
      !isDraft(savedDraft) ||
      (!savedDraft.claim.text && !savedDraft.claim.sourceId)
    )
      return;
    const next = [
      ...drafts.filter(
        (d) =>
          d.claim.sourceId !== savedDraft.claim.sourceId ||
          d.claim.text !== savedDraft.claim.text,
      ),
      savedDraft,
    ].slice(-20);
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
      setDrafts(next);
    } catch {
      setNotice(
        "This device could not save another draft. Export your evidence to keep a backup.",
      );
    }
  }
  async function getZip() {
    if (!zip.current) {
      zip.current = await fetchKnownSnapshot();
    }
    return zip.current;
  }
  function changeClaim(part: Partial<Claim>) {
    reviewRequest.current++;
    setBusy((current) =>
      ["review", "restore", "decision"].includes(current) ? "" : current,
    );
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
    const request = ++reviewRequest.current;
    setError("");
    setBusy("review");
    try {
      if (
        !claim.text.trim() ||
        !claim.sourceId ||
        !claim.start ||
        !claim.end ||
        claim.start >= claim.end
      ) {
        throw new Error(
          "Enter a statement, source and valid dates before checking the evidence.",
        );
      }
      let records = fixture.records;
      let knownSource = fixture.sources.some(
        (s) => s.source_name === claim.sourceId,
      );
      if (fixture.sources[0]?.source_name !== claim.sourceId) {
        records = await snapshot.sourceRecords(claim.sourceId);
        if (request !== reviewRequest.current) return;
        knownSource = true; // The worker rejects IDs absent from the hash-checked source CSV.
        const source = indexValue.current?.sources.find(
          (s) => s.id === claim.sourceId,
        );
        setFixture({
          manifest: fixture.manifest,
          sources: [
            {
              source_name: claim.sourceId,
              country:
                source?.country ?? records[0]?.raw.country ?? "Not reported",
              sector:
                source?.sector ?? records[0]?.raw.sector ?? "Not reported",
              lat: source?.lat ?? "",
              lon: source?.lon ?? "",
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
        knownSource,
      );
      if (request !== reviewRequest.current) return;
      setPacket(created);
      setResponse(emptyResponse);
      setNotice("");
    } catch (e) {
      if (request === reviewRequest.current)
        setError(e instanceof Error ? e.message : "Could not create review.");
    } finally {
      if (request === reviewRequest.current) setBusy("");
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
          // Keep the immediate suggestion and any human confirmation already made.
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
      setNotice("");
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
    const request = ++reviewRequest.current;
    const payload = { ...packet.payload, response };
    const completed = {
      ...packet,
      payload,
      digest: await digestPayload(payload),
      receipt: null,
    };
    if (request !== reviewRequest.current) return;
    setPacket(completed);
    const remainingDrafts = drafts.filter(
      (d) =>
        d.claim.sourceId !== completed.payload.claim.sourceId ||
        d.claim.text !== completed.payload.claim.text,
    );
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(remainingDrafts));
      setDrafts(remainingDrafts);
    } catch {
      /* Current review remains available for export. */
    }
    setHistory((h) => [
      ...h.filter(
        (p) =>
          p.payload.revision !== completed.payload.revision ||
          p.payload.claim.sourceId !== completed.payload.claim.sourceId,
      ),
      completed,
    ]);
    setNotice(
      "Review completed and saved on this device. Export a file to share it.",
    );
  }
  async function verify(text = verifyInput) {
    const request = ++verifyRequest.current;
    setBusy("verify");
    setError("");
    setReport(undefined);
    setVerifyPacketValue(undefined);
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
      ) {
        const { verifyAnchor } = await import(
          "../../../packages/core/ledger.ts"
        );
        result.anchor = await verifyAnchor(p, ledger.rpcUrl);
      }
      if (request === verifyRequest.current) setReport(result);
    } catch (e) {
      if (request === verifyRequest.current)
        setError(e instanceof Error ? e.message : "Invalid packet.");
    } finally {
      if (request === verifyRequest.current) setBusy("");
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
    setNotice("One record removed. The edited file was rehashed.");
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
      const { publishPacket } = await import(
        "../../../packages/core/ledger.ts"
      );
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
            navigate("home");
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
              ["home", "Home"],
              ["explore", "Explore"],
              ["review", "Review desk"],
              ["reviews", "Your reviews"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "nav active" : "nav"}
              aria-current={tab === value ? "page" : undefined}
              onClick={() => navigate(value)}
            >
              {label}
            </button>
          ))}
          <details
            className="more-menu"
            ref={moreMenu}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                moreMenu.current?.removeAttribute("open");
                moreMenu.current?.querySelector("summary")?.focus();
              }
            }}
          >
            <summary className="nav">More</summary>
            <div className="more-menu-items">
              <button onClick={() => navigate("proof")}>Proof lab</button>
              <button onClick={() => navigate("verify")}>
                Verify a packet
              </button>
              <button onClick={() => navigate("method")}>
                Method &amp; limits
              </button>
              <button onClick={() => navigate("about")}>
                About AfterPlume
              </button>
              <a
                href="https://github.com/kathir-iTech/AfterPlume"
                target="_blank"
                rel="noreferrer"
              >
                Source code <ArrowUpRight size={13} />
              </a>
            </div>
          </details>
        </nav>
      </header>
      <Suspense
        fallback={
          <main className="page route-loading" role="status">
            Opening…
          </main>
        }
      >
        <main className="page">
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
          {tab === "home" && (
            <Home
              index={index}
              records={example.current?.records ?? []}
              watchProof={() => navigate("proof")}
              startReview={() => navigate("explore")}
              resumeReview={savedDraft ? () => navigate("review") : undefined}
              resumeLabel={
                savedDraft?.packet && !isDraft(savedDraft)
                  ? "Open your saved review"
                  : "Continue your review"
              }
            />
          )}
          {tab === "about" && <About />}
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
                loadExample();
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
          {tab === "reviews" && (
            <Reviews
              history={history}
              draft={savedDraft}
              drafts={drafts}
              busy={!!busy}
              resume={(d) => {
                archiveCurrentDraft();
                navigate("review");
                void restoreWorkspace(d);
              }}
              start={startNewReview}
              open={(p) => {
                archiveCurrentDraft();
                navigate("review");
                void restoreWorkspace({
                  claim: p.payload.claim,
                  response: p.payload.response,
                  assistance: p.payload.assistance,
                  packet: p,
                  updated: p.payload.created,
                });
              }}
            />
          )}
          {tab === "review" && (
            <ReviewDesk
              storageStatus={storageStatus}
              loadExample={loadExample}
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
                  <h1>Verify a review.</h1>
                  <p className="intro">
                    Import a review and check it against the source data.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={16} /> Import review packet
                </button>
              </section>
              {!verifyInput && (
                <details className="disclosure verify-example">
                  <summary>Try an example review</summary>
                  <div className="packaged-example">
                    <div>
                      <h2>Start with a working example.</h2>
                      <p>Try the original review without importing a file.</p>
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
                            e instanceof Error
                              ? e.message
                              : "Example unavailable.",
                          );
                        }
                      }}
                    >
                      Load example & verify
                    </button>
                  </div>
                </details>
              )}
              {verifyPacketValue && (
                <div className="verified-context panel">
                  <strong>
                    {verifyPacketValue.payload.claim.sourceId} · Revision{" "}
                    {verifyPacketValue.payload.revision}
                  </strong>
                  <p>{verifyPacketValue.payload.claim.text}</p>
                  <small>
                    {verifyPacketValue.payload.claim.hypothetical
                      ? "Practice statement"
                      : "User-entered statement"}{" "}
                    ·{" "}
                    {verifyPacketValue.payload.response.action === "pending"
                      ? "Evidence draft · decision not recorded"
                      : "Decision recorded"}
                  </small>
                </div>
              )}
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
                      await verify(await f.text());
                    }}
                  />
                  <details className="json-disclosure">
                    <summary>Paste JSON instead</summary>
                    <label className="field-label" htmlFor="packet-json">
                      Paste exported JSON or import a file
                    </label>
                    <textarea
                      className="json-input"
                      id="packet-json"
                      value={verifyInput}
                      onChange={(e) => {
                        verifyRequest.current++;
                        setBusy((current) =>
                          current === "verify" ? "" : current,
                        );
                        setVerifyInput(e.target.value);
                        setReport(undefined);
                        setVerifyPacketValue(undefined);
                      }}
                      placeholder={
                        '{\n  "payload": { ... },\n  "digest": "..."\n}'
                      }
                    />
                  </details>
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
                  <details className="disclosure">
                    <summary>Use your own copy of the source archive</summary>
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
                          verifyRequest.current++;
                          setBusy((current) =>
                            current === "verify" ? "" : current,
                          );
                          setReport(undefined);
                          setNotice(
                            "Snapshot supplied. Its SHA-256 will be checked before any ZIP member is unpacked.",
                          );
                        }}
                      />
                    </label>
                  </details>
                </section>
                <section className="panel verification-results">
                  <div className="panel-heading">
                    <ShieldCheck size={18} />
                    <h2>Verification results</h2>
                  </div>
                  {report ? (
                    <>
                      <CheckRow
                        label="File integrity"
                        check={report.integrity}
                      />
                      <CheckRow
                        label="Source completeness"
                        check={report.snapshot}
                      />
                      <CheckRow
                        label="Optional blockchain record"
                        check={report.anchor}
                      />
                    </>
                  ) : (
                    <div className="finding-empty">
                      <ShieldCheck size={43} strokeWidth={1.1} />
                      <h3>Import a review.</h3>
                      <p>
                        The verifier reconstructs the source selection and
                        finding. No account or author’s app state is required.
                      </p>
                    </div>
                  )}
                  <details className="disclosure">
                    <summary>Try removing a record</summary>
                    <div className="attack-card">
                      <FlaskConical size={20} />
                      <div>
                        <h3>Try a harder edit</h3>
                        <p>
                          Remove a matching record, recompute the result and
                          rehash the file. Integrity can pass. Source inclusion
                          should fail.
                        </p>
                        <button
                          className="button secondary"
                          disabled={
                            !!busy ||
                            !(verifyPacketValue ?? packet)?.payload.records
                              .length
                          }
                          onClick={attack}
                        >
                          Omit a record & rehash <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </details>
                </section>
              </div>
              <details className="cli-disclosure">
                <summary>Verify from a terminal</summary>
                <div className="cli-note">
                  <FileCheck2 size={18} />
                  <div>
                    <strong>Replay outside the browser</strong>
                    <code>
                      npm run verify -- review.json
                      apps/web/public/data/mars-snapshot.zip
                    </code>
                    <span>
                      The CLI is a separate entry point using the same
                      documented evidence policy.
                    </span>
                  </div>
                </div>
              </details>
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
            </div>
            <span>Data: UNEP MARS · Noncommercial prototype</span>
            <a
              href="https://github.com/kathir-iTech/AfterPlume"
              target="_blank"
              rel="noreferrer"
            >
              Source code <ArrowUpRight size={12} />
            </a>
          </footer>
        </main>
      </Suspense>
    </>
  );
}
