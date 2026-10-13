import type { Dispatch, SetStateAction } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
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
  X,
} from "lucide-react";
import type {
  Claim,
  HumanResponse,
  Packet,
  PlumeRecord,
} from "../../../packages/core/index.ts";
import {
  titles,
  findingTitle,
  download,
  short,
  type Fixture,
  type Assistance,
} from "./ui-data.ts";
import { Pill } from "./Checks.tsx";
import Timeline from "./Timeline.tsx";
import { downloadResultCard } from "./result-card.ts";

type Setter<T> = Dispatch<SetStateAction<T>>;
type Props = {
  fixture: Fixture;
  claim: Claim;
  packet?: Packet;
  history: Packet[];
  response: HumanResponse;
  assistance: Assistance;
  busy: string;
  aiBusy: boolean;
  aiStatus: string;
  expanded?: string;
  selected: PlumeRecord[];
  latest?: PlumeRecord;
  complete?: boolean;
  guidance: readonly { id: string; title: string; text: string; url: string }[];
  showHistory: boolean;
  setShowHistory: Setter<boolean>;
  setAssistance: Setter<Assistance>;
  setExpanded: Setter<string | undefined>;
  setResponse: Setter<HumanResponse>;
  setHistory: Setter<Packet[]>;
  setPacket: Setter<Packet | undefined>;
  setNotice: Setter<string>;
  setVerifyInput: Setter<string>;
  changeClaim: (part: Partial<Claim>) => void;
  requestAI: () => void;
  cancelAI: () => void;
  confirmSuggestion: () => void;
  runReview: () => Promise<void>;
  finishResponse: () => Promise<void>;
  loadLedger: () => Promise<void>;
  verify: (text?: string) => Promise<void>;
  navigate: (
    value: "explore" | "proof" | "review" | "verify" | "method",
  ) => void;
};
export default function ReviewDesk(props: Props) {
  const {
    claim,
    packet,
    history,
    response,
    assistance,
    busy,
    aiBusy,
    aiStatus,
    expanded,
    fixture,
    selected,
    latest,
    complete,
    guidance,
    showHistory,
    setShowHistory,
    changeClaim,
    requestAI,
    cancelAI,
    confirmSuggestion,
    setAssistance,
    runReview,
    setExpanded,
    navigate,
    finishResponse,
    setResponse,
    loadLedger,
    verify,
    setHistory,
    setPacket,
    setNotice,
    setVerifyInput,
  } = props;
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">FROM A STATEMENT TO A CHECKABLE REVIEW</p>
          <h1>
            Check the claim.
            <br />
            <span>Keep the evidence.</span>
          </h1>
          <p className="intro">
            A detection is a record. A repair is a different claim.
            <br className="desktop-break" /> Make the distinction visible—and
            let someone else replay it.
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
          {packet && (
            <button
              className="text-button"
              onClick={() => downloadResultCard(packet)}
            >
              <ArrowDownToLine size={14} /> Download result card
            </button>
          )}
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
            {fixture.sources[0]?.source_name}{" "}
            <Pill>{fixture.sources[0]?.sector}</Pill>
          </h2>
          <span>{fixture.sources[0]?.country} · UNEP IMEO MARS</span>
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
            {Math.abs(Number(fixture.sources[0]?.lat)).toFixed(4)}°{" "}
            {Number(fixture.sources[0]?.lat) >= 0 ? "N" : "S"}
            <br />
            {Math.abs(Number(fixture.sources[0]?.lon)).toFixed(4)}°{" "}
            {Number(fixture.sources[0]?.lon) >= 0 ? "E" : "W"}
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
              ? "Instant suggestion ready · semantic loading"
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
          {assistance.suggestedKind && !assistance.confirmedByHuman && (
            <div className="suggestion">
              <Sparkles size={16} />
              <p>
                Suggested type
                <br />
                <strong>{titles[assistance.suggestedKind]}</strong>
                <small>
                  {assistance.engine === "lexical"
                    ? "Keyword suggestion · ready now"
                    : "On-device semantic suggestion"}
                </small>
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
                {claim.kind === "repair_occurred"
                  ? "Repair date · included"
                  : "Start · included"}
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
          <Timeline
            records={fixture.records}
            start={claim.start}
            end={claim.end}
            onSelect={(id) => setExpanded(expanded === id ? undefined : id)}
          />
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
                  className={"record-item " + (match ? "in-interval" : "")}
                >
                  <button
                    className="record-summary"
                    onClick={() =>
                      setExpanded(expanded === r.id ? undefined : r.id)
                    }
                    aria-expanded={expanded === r.id}
                  >
                    <span className={"record-dot " + (match ? "red" : "")} />
                    <span className="record-date">
                      {r.acquired.slice(0, 10)}
                      <small>{r.satellite.split(" - ")[0]}</small>
                    </span>
                    <span className="record-rate">
                      {r.rate
                        ? Number(r.rate).toLocaleString("en-US")
                        : "Not quantified"}
                      <small>{r.rate ? "kg/h" : "positive detection"}</small>
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
                        <dd>{r.std ? `${r.std} kg/h` : "Not reported"}</dd>
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
              Rates are instantaneous estimates. A record without a rate still
              counts as a detection.
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
                <div className="finding-count">
                  {packet.payload.records.length}
                </div>
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
                Run the check to see what these records establish—and what they
                leave open.
              </p>
            </div>
          )}
          <details className="limits-note">
            <summary>What this finding does not prove</summary>
            <div className="limits-content">
              <Info size={16} />
              <div>
                <strong>Keep this limit visible</strong>
                <p>
                  No matching records is not proof of zero emissions. The
                  snapshot has no complete negative-observation history.
                </p>
              </div>
            </div>
          </details>
          <button className="text-button" onClick={() => navigate("method")}>
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
                  <blockquote>{packet.payload.response.revisedText}</blockquote>
                )}
                <span className="field-help">
                  Original statement and conflicting evidence remain in the
                  packet.
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
                      onChange={() => setResponse((r) => ({ ...r, action }))}
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
                  <ShieldCheck size={15} /> Completing a review does not certify
                  mitigation.
                </p>
                <button className="button primary" onClick={finishResponse}>
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
            Guidance text is authored and cited. The local model ranks notes and
            suggests a claim type; the evidence finding follows fixed rules.
          </p>
        </section>
        <section className="panel portable-panel">
          <span className="portable-icon">
            <FileJson size={27} />
          </span>
          <h2>A review you can hand over.</h2>
          <p>
            Export the statement, source records, policy, finding and human
            response. Recompute the result outside this app.
          </p>
          <button
            className="button secondary full"
            disabled={!packet}
            onClick={() => {
              if (packet) {
                const text = JSON.stringify(packet, null, 2);
                setVerifyInput(text);
                navigate("verify");
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
                  <small>
                    {p.payload.claim.sourceId} · {short(p.digest)}
                  </small>
                </span>
                <Pill
                  tone={
                    history
                      .slice(i + 1)
                      .some(
                        (next) =>
                          next.payload.claim.sourceId ===
                          p.payload.claim.sourceId,
                      )
                      ? "neutral"
                      : "teal"
                  }
                >
                  {history
                    .slice(i + 1)
                    .some(
                      (next) =>
                        next.payload.claim.sourceId ===
                        p.payload.claim.sourceId,
                    )
                    ? "Older revision"
                    : "Latest for source"}
                </Pill>
                <span>{p.receipt ? "Commitment attached" : "Unpublished"}</span>
                <button className="text-button" onClick={() => download(p)}>
                  Export
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    navigate("verify");
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
  );
}
