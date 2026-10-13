import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  GitBranch,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
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
  navigate: (value: import("./routes.ts").View) => void;
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
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (packet) setEditing(false);
  }, [packet?.payload.created]);
  const showingResult = !!packet && !editing;
  const source = fixture.sources[0];
  function replay() {
    if (packet) {
      const text = JSON.stringify(packet, null, 2);
      setVerifyInput(text);
      navigate("verify");
      void verify(text);
    }
  }
  const brief =
    packet?.payload.finding.status === "DETECTION_RECORDED"
      ? "Recorded observations conflict with “no detections” in this interval."
      : packet?.payload.finding.status === "NO_MATCHING_DETECTIONS_IN_SNAPSHOT"
        ? "No records match this interval. This does not establish zero emissions."
        : packet?.payload.finding.status === "INVALID_INPUT"
          ? "Choose a known source and valid dates."
          : "Satellite observations alone cannot establish this claim. Field evidence is needed.";
  function recordList(records: PlumeRecord[]) {
    return (
      <div className="record-list">
        {records.map((r) => (
          <div
            key={r.id}
            className={`record-item ${selected.some((s) => s.id === r.id) ? "in-interval" : ""}`}
          >
            <button
              className="record-summary"
              aria-expanded={expanded === r.id}
              onClick={() => setExpanded(expanded === r.id ? undefined : r.id)}
            >
              <span className="record-dot" />
              <span className="record-date">
                {r.acquired.slice(0, 10)}
                <small>{r.satellite.split(" - ")[0]}</small>
              </span>
              <span className="record-rate">
                {r.rate ? Number(r.rate).toLocaleString() : "Not quantified"}
                <small>{r.rate ? "kg/h" : "positive detection"}</small>
              </span>
              <ChevronDown size={14} />
            </button>
            {expanded === r.id && (
              <div className="record-detail">
                <dl>
                  <dt>Provider UUID</dt>
                  <dd>{r.id}</dd>
                  <dt>Original acquisition</dt>
                  <dd>{r.acquired}</dd>
                  <dt>Reported standard deviation</dt>
                  <dd>{r.std ? `${r.std} kg/h` : "Not reported"}</dd>
                  <dt>Institution</dt>
                  <dd>{r.raw.detection_institution}</dd>
                  <dt>Source</dt>
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
        ))}
      </div>
    );
  }
  return (
    <>
      <section className="review-heading section-heading">
        <div>
          <h1>
            {complete && !editing
              ? "Your review."
              : showingResult
                ? "The evidence."
                : "Review a statement."}
          </h1>
          <p>
            {showingResult
              ? "Check the finding, then record your response."
              : "Choose a source and dates. Check the satellite observations."}
          </p>
        </div>
        <div className="review-actions">
          {history.length > 0 && (
            <button
              className="button secondary"
              onClick={() => setShowHistory(!showHistory)}
            >
              <GitBranch size={15} />
              Review history <span className="count">{history.length}</span>
            </button>
          )}
          {packet && (
            <button className="button primary" onClick={() => download(packet)}>
              <ArrowDownToLine size={16} />
              Export review
            </button>
          )}
          {packet && (
            <details className="action-menu">
              <summary>More actions</summary>
              <div>
                <button onClick={() => downloadResultCard(packet)}>
                  Download result card
                </button>
                <button onClick={loadLedger}>
                  Optional blockchain publication
                </button>
              </div>
            </details>
          )}
        </div>
      </section>
      <div className="source-summary review-source">
        <strong>{source?.source_name}</strong>
        <span>{source?.country}</span>
        <button className="text-button" onClick={() => navigate("explore")}>
          Change source <ArrowRight size={14} />
        </button>
        <details>
          <summary>Source details</summary>
          <p>
            {fixture.records.length} observations · {source?.sector} · Latest{" "}
            {latest?.acquired.slice(0, 10) || "not reported"}
          </p>
          <p>
            {source?.lat}, {source?.lon} · UNEP MARS · Pinned 12 Oct 2026
          </p>
        </details>
      </div>
      {(!packet || editing) && (
        <section className="panel claim-panel focused-claim">
          <div className="panel-heading">
            <h2>Bound the statement</h2>
            <span className="example-tag">Hypothetical example</span>
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
          <div className="claim-options">
            <div>
              <label className="field-label" htmlFor="source-id">
                Exact provider source ID
              </label>
              <input
                id="source-id"
                value={claim.sourceId}
                onChange={(e) => changeClaim({ sourceId: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="claim-kind">
                Confirmed claim type
              </label>
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
            </div>
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
          <div className="claim-assistance">
            <button
              className="assist-button"
              onClick={requestAI}
              disabled={aiBusy}
            >
              <Sparkles size={15} />
              {aiBusy ? "Suggestions loading…" : "Suggest a claim type locally"}
            </button>
            {assistance.suggestedKind && !assistance.confirmedByHuman && (
              <div className="suggestion">
                <p>
                  Suggested type{" "}
                  <strong>{titles[assistance.suggestedKind]}</strong>
                  <small>
                    {assistance.engine === "lexical"
                      ? "Keyword suggestion · ready now"
                      : "On-device semantic suggestion"}
                  </small>
                </p>
                <button onClick={confirmSuggestion}>Confirm</button>
                <button
                  className="keep-type"
                  onClick={() =>
                    setAssistance((a) => ({ ...a, confirmedByHuman: true }))
                  }
                >
                  Keep my type
                </button>
              </div>
            )}
            {aiStatus && (
              <details className="assistance-details">
                <summary>
                  Local assistance details{aiBusy ? " · loading" : ""}
                </summary>
                <p className="ai-status" role="status">
                  {aiStatus}
                </p>
                {aiBusy && (
                  <button className="text-button" onClick={cancelAI}>
                    Cancel loading
                  </button>
                )}
              </details>
            )}
          </div>
          <div className="claim-submit">
            <span>Dates use the provider’s calendar.</span>
            <button
              className="button primary"
              disabled={!!busy || !assistance.confirmedByHuman}
              onClick={runReview}
            >
              {busy === "review" ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Search size={17} />
              )}
              Run evidence check <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
      {showingResult && packet && (
        <>
          <div className="review-result-grid">
            <section
              className={`panel finding-panel focused-finding ${packet.payload.finding.status === "DETECTION_RECORDED" ? "conflict" : "caution"}`}
            >
              <p className="eyebrow">FINDING</p>
              <div
                className="finding-count"
                aria-label={`${packet.payload.records.length} matching records`}
              >
                {packet.payload.records.length}
                <span>matching records</span>
              </div>
              <h2>{findingTitle[packet.payload.finding.status]}</h2>
              <p className="finding-brief">{brief}</p>
              <div className="finding-qualification">
                <span>Physical mitigation</span>
                <Pill tone="amber">Not assessed</Pill>
              </div>
              <details className="disclosure">
                <summary>What this finding means</summary>
                <p>{packet.payload.finding.reason}</p>
                <p>
                  Records cover detections, not every satellite overpass. A
                  repair, sustained cessation or measured reduction needs
                  appropriate field evidence.
                </p>
                <p>
                  Fixed policy v1.0.0 · Every matching source-assigned
                  observation is included, across all sensors and rates.
                </p>
                <button
                  className="text-button"
                  onClick={() => navigate("method")}
                >
                  Full method <ArrowUpRight size={13} />
                </button>
              </details>
              <button className="text-button" onClick={() => setEditing(true)}>
                Edit statement <ArrowRight size={14} />
              </button>
            </section>
            <section className="panel evidence-panel focused-evidence">
              <div className="panel-heading">
                <h2>Satellite observations</h2>
              </div>
              <Timeline
                records={fixture.records}
                start={claim.start}
                end={claim.end}
                onSelect={(id) => setExpanded(expanded === id ? undefined : id)}
              />
              {recordList(selected)}
              <details className="disclosure">
                <summary>
                  All source observations ({fixture.records.length})
                </summary>
                {recordList(fixture.records)}
              </details>
            </section>
          </div>
          <section className="panel response-panel">
            <div className="panel-heading">
              <h2>{complete ? "Your response" : "Respond to the finding"}</h2>
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
                </div>
              </div>
            ) : (
              <>
                <div className="response-options">
                  {(
                    [
                      ["correct", "Correct or narrow"],
                      ["retain", "Retain with explanation"],
                      ["withdraw", "Withdraw the statement"],
                    ] as const
                  ).map(([action, title]) => (
                    <label key={action} className="response-option">
                      <input
                        type="radio"
                        name="response"
                        checked={response.action === action}
                        onChange={() => setResponse((r) => ({ ...r, action }))}
                      />
                      <strong>{title}</strong>
                    </label>
                  ))}
                </div>
                {response.action !== "pending" && (
                  <>
                    <div className="response-fields">
                      <div>
                        <label className="field-label" htmlFor="response">
                          Your explanation
                        </label>
                        <textarea
                          id="response"
                          maxLength={5000}
                          placeholder="Explain what the evidence changes."
                          value={response.explanation}
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
                            maxLength={3000}
                            placeholder="Write the statement the evidence supports."
                            value={response.revisedText}
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
                      <button
                        className="button primary"
                        onClick={finishResponse}
                      >
                        <Check size={16} />
                        Complete this review
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {complete && (
              <div className="saved-actions">
                <button className="button primary" onClick={replay}>
                  <ShieldCheck size={16} />
                  Verify this review
                </button>
                <button className="button secondary" onClick={runReview}>
                  <Plus size={15} />
                  Start next revision
                </button>
              </div>
            )}
          </section>
          {!complete && (
            <button className="text-button review-replay" onClick={replay}>
              Verify this review <ArrowRight size={14} />
            </button>
          )}
        </>
      )}
      <details className="guidance-disclosure disclosure">
        <summary>Evidence guidance</summary>
        <div className="guidance-grid">
          {guidance.map((c) => (
            <article key={c.id}>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <a href={c.url} target="_blank" rel="noreferrer">
                Reference <ArrowUpRight size={12} />
              </a>
            </article>
          ))}
        </div>
      </details>
      {showHistory && (
        <section className="panel history-panel">
          <div className="panel-heading">
            <h2>Local revision history</h2>
            <button
              className="icon-button"
              aria-label="Close history"
              onClick={() => setShowHistory(false)}
            >
              <X size={16} />
            </button>
          </div>
          {history.map((p, i) => (
            <div className="history-row" key={p.digest}>
              <strong>r{p.payload.revision}</strong>
              <span>
                {p.payload.claim.sourceId}
                <small>{short(p.digest)}</small>
              </span>
              <Pill
                tone={
                  history
                    .slice(i + 1)
                    .some(
                      (n) =>
                        n.payload.claim.sourceId === p.payload.claim.sourceId,
                    )
                    ? "neutral"
                    : "teal"
                }
              >
                {history
                  .slice(i + 1)
                  .some(
                    (n) =>
                      n.payload.claim.sourceId === p.payload.claim.sourceId,
                  )
                  ? "Older revision"
                  : "Latest for source"}
              </Pill>
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
          ))}
          <details className="disclosure">
            <summary>Manage this browser’s history</summary>
            <button
              className="text-button"
              onClick={() => {
                localStorage.removeItem("afterplume-history-v1");
                setHistory([]);
                setPacket(undefined);
                setNotice(
                  "Local history cleared. Exported files are preserved.",
                );
              }}
            >
              Clear local history
            </button>
          </details>
        </section>
      )}
    </>
  );
}
