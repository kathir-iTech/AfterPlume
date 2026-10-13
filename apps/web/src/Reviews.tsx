import { ArrowRight, Download, Plus } from "lucide-react";
import type { Packet } from "../../../packages/core/index.ts";
import type { Workspace } from "./workspace.ts";
import { isDraft } from "./workspace.ts";
import { download } from "./ui-data.ts";

export default function Reviews({
  history,
  draft,
  drafts,
  resume,
  open,
  start,
  busy,
}: {
  history: Packet[];
  draft?: Workspace;
  drafts: Workspace[];
  resume: (draft: Workspace) => void;
  open: (packet: Packet) => void;
  start: () => void;
  busy: boolean;
}) {
  return (
    <>
      <section className="section-heading">
        <div>
          <h1>Your reviews.</h1>
          <p>Saved on this device. Export a file to share or keep a backup.</p>
        </div>
        <button className="button primary" onClick={start}>
          <Plus size={16} />
          New review
        </button>
      </section>
      {[
        ...(draft && isDraft(draft) ? [draft] : []),
        ...drafts.filter(
          (d) =>
            d.claim.sourceId !== draft?.claim.sourceId ||
            d.claim.text !== draft?.claim.text,
        ),
      ].map((d, i) => (
        <section className="panel workspace-draft" key={`${d.updated}-${i}`}>
          <div>
            <span className="eyebrow">IN PROGRESS</span>
            <h2>{d.claim.sourceId || "Choose a source"}</h2>
            <p>{d.claim.text || "Your statement is waiting to be added."}</p>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => resume(d)}
          >
            Continue review <ArrowRight size={16} />
          </button>
        </section>
      ))}
      <section className="review-library" aria-label="Saved reviews">
        {history.length ? (
          [...history].reverse().map((p) => (
            <article className="panel library-row" key={p.digest}>
              <div>
                <span className="eyebrow">
                  {p.payload.claim.hypothetical ? "PRACTICE" : "YOUR STATEMENT"}{" "}
                  · REVISION {p.payload.revision}
                </span>
                <h2>{p.payload.claim.sourceId}</h2>
                <p>{p.payload.claim.text}</p>
                <small>
                  {p.payload.claim.start} → {p.payload.claim.end} (end excluded)
                  · {p.payload.records.length} matching records
                </small>
              </div>
              <div className="library-actions">
                <button
                  className="button secondary"
                  onClick={() => download(p)}
                >
                  <Download size={15} />
                  Export
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => open(p)}
                >
                  Open review <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty-state">
            <h2>No completed reviews yet.</h2>
            <p>
              Find a source, check a statement, then save your decision here.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
