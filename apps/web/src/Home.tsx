import { ArrowRight, ShieldCheck } from "lucide-react";
import WorldMap from "./WorldMap.tsx";
import type { SourceIndex } from "./explorer-types.ts";
import type { PlumeRecord } from "../../../packages/core/index.ts";
export default function Home({
  index,
  records,
  watchProof,
  startReview,
  resumeReview,
  resumeLabel = "Continue your review",
}: {
  index?: SourceIndex;
  records: PlumeRecord[];
  watchProof: () => void;
  startReview: () => void;
  resumeReview?: () => void;
  resumeLabel?: string;
}) {
  const matches = records.filter(
    (r) =>
      r.sourceId === "AZE_S_010" &&
      r.acquired.slice(0, 10) >= "2026-05-01" &&
      r.acquired.slice(0, 10) < "2026-06-02",
  );
  return (
    <section className="home-stage">
      <div className="home-copy">
        <p className="eyebrow">FOR CLIMATE JOURNALISTS</p>
        <h1>
          Missing methane
          <br />
          evidence.
          <br />
          <em>Found.</em>
        </h1>
        <p className="home-description">
          Review methane claims with satellite evidence.
          <br />
          Keep a traceable record of your decision.
        </p>
        <button className="button primary home-cta" onClick={startReview}>
          <ShieldCheck size={18} />
          Find a source
          <ArrowRight size={18} />
        </button>
        <p className="home-helper">
          Choose a source → Check a statement → Save a review
        </p>
        <div className="home-secondary">
          {resumeReview && (
            <button className="text-button" onClick={resumeReview}>
              {resumeLabel} <ArrowRight size={14} />
            </button>
          )}
          <button className="text-button" onClick={watchProof}>
            Watch the proof <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <div className="home-visual">
        <WorldMap
          sources={index?.sources ?? []}
          selected={index?.sources.find((s) => s.id === "AZE_S_010")}
          onSelect={() => {}}
          preview
        />
        <div className="home-example">
          <div>
            <span className="example-label">EXAMPLE STATEMENT</span>
            <p>“No methane detections.”</p>
          </div>
          <div className="home-observation-count">
            <strong>{matches.length}</strong>
            <span>
              satellite records
              <br />
              in the example interval
            </span>
          </div>
        </div>
      </div>
      <p className="home-provenance">
        UNEP MARS <span>·</span>{" "}
        {(index?.manifest.recordCount ?? 30319).toLocaleString()} observations{" "}
        <span>·</span> {(index?.manifest.sourceCount ?? 4211).toLocaleString()}{" "}
        sources
      </p>
    </section>
  );
}
