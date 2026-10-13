import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Globe2,
  LoaderCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import WorldMap from "./WorldMap.tsx";
import type { BatchRow, Source, SourceIndex } from "./explorer-types.ts";
export default function Observatory({
  index,
  openSource,
  watchProof,
  runBatch,
  busy,
}: {
  index?: SourceIndex;
  openSource: (source: Source, start?: string, end?: string) => void;
  watchProof: () => void;
  runBatch: (start: string, end: string) => Promise<BatchRow[]>;
  busy: boolean;
}) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Source>();
  const [batch, setBatch] = useState<BatchRow[]>();
  const [batchBusy, setBatchBusy] = useState(false);
  const [error, setError] = useState("");
  const [start, setStart] = useState("2026-05-01");
  const [end, setEnd] = useState("2026-06-02");
  const [evaluatedInterval, setEvaluatedInterval] = useState<{
    start: string;
    end: string;
  }>();
  const sources = index?.sources ?? [];
  const countries = useMemo(
    () => [...new Set(sources.map((s) => s.country))].sort(),
    [sources],
  );
  const sectors = useMemo(
    () => [...new Set(sources.map((s) => s.sector))].sort(),
    [sources],
  );
  const filtered = useMemo(
    () =>
      sources.filter(
        (s) =>
          (!country || s.country === country) &&
          (!sector || s.sector === sector) &&
          (!deferred ||
            `${s.id} ${s.country} ${s.sector}`
              .toLowerCase()
              .includes(deferred.toLowerCase())),
      ),
    [sources, country, sector, deferred],
  );
  const batchMap = useMemo(
    () => new Map(batch?.map((r) => [r.sourceId, r])),
    [batch],
  );
  const active =
    (selected && filtered.some((s) => s.id === selected.id)
      ? selected
      : undefined) ??
    filtered.find((s) => s.id === "AZE_S_010") ??
    filtered[0];
  function exportBatch() {
    if (!batch || !evaluatedInterval) return;
    const text = [
      "source_id,start_included,end_excluded,record_count,policy_result,statement_origin",
      ...batch.map(
        (r) =>
          `${r.sourceId},${evaluatedInterval.start},${evaluatedInterval.end},${r.count},${r.status},hypothetical_interval_check`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "afterplume-all-source-interval-check.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <section id="sources" className="source-explorer">
        <div className="section-heading">
          <div>
            <h1>Explore methane sources.</h1>
            <p>Find a source. Open its observations.</p>
          </div>
          <span className="pill teal">
            <Globe2 size={13} /> {filtered.length.toLocaleString()} sources
          </span>
        </div>
        <WorldMap
          sources={filtered}
          selected={active}
          onSelect={(s) => setSelected(s)}
        />
        <div className="explorer-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search sources"
              placeholder="Source ID, country or sector"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select
            aria-label="Filter country"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            aria-label="Filter sector"
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {active && (
          <div className="selected-source">
            <div>
              <span className="eyebrow">SELECTED ON MAP</span>
              <h3>
                {active.id} <span>{active.country}</span>
              </h3>
              <p>
                {active.sector} · {active.count} detections · latest{" "}
                {active.latest || "not reported"}
              </p>
            </div>
            <button
              className="button primary"
              disabled={busy}
              onClick={() => openSource(active)}
            >
              {busy ? <LoaderCircle size={17} className="spin" /> : null}Review
              this source <ArrowRight size={17} />
            </button>
          </div>
        )}
        {!index ? (
          <p className="empty-state" role="status">
            Loading the source catalogue…
          </p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>No sources match those filters.</h3>
            <button
              className="text-button"
              onClick={() => {
                setQuery("");
                setCountry("");
                setSector("");
                setPage(0);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="source-table-wrap">
            <table className="source-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Country / sector</th>
                  <th>Detections</th>
                  <th>Latest observation</th>
                  {batch && <th>Interval check</th>}
                  <th>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(page * 6, (page + 1) * 6).map((s) => (
                  <tr key={s.id} onMouseEnter={() => setSelected(s)}>
                    <td>
                      <button
                        className="source-id-button"
                        onClick={() => setSelected(s)}
                      >
                        {s.id}
                      </button>
                    </td>
                    <td>
                      {s.country}
                      <small>{s.sector}</small>
                    </td>
                    <td>{s.count.toLocaleString()}</td>
                    <td>{s.latest || "—"}</td>
                    {batch && (
                      <td>
                        <span
                          className={`pill ${batchMap.get(s.id)?.count ? "red" : "amber"}`}
                        >
                          {batchMap.get(s.id)?.count ?? 0} recorded
                        </span>
                      </td>
                    )}
                    <td>
                      <button
                        aria-label={`Review ${s.id}`}
                        className="table-open"
                        disabled={busy}
                        onClick={() =>
                          openSource(
                            s,
                            batch ? evaluatedInterval?.start : undefined,
                            batch ? evaluatedInterval?.end : undefined,
                          )
                        }
                      >
                        <ArrowUpRight size={19} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 6 && (
          <div className="pagination">
            <span>
              {page * 6 + 1}–{Math.min((page + 1) * 6, filtered.length)} of{" "}
              {filtered.length.toLocaleString()}
            </span>
            <div>
              <button
                className="button secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                className="button secondary"
                disabled={(page + 1) * 6 >= filtered.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
      <details className="batch-disclosure disclosure">
        <summary>Check an interval across all sources</summary>
        <section className="batch-panel panel">
          <div className="section-heading">
            <div>
              <h2>Check all {sources.length.toLocaleString()} sources.</h2>
              <p>
                One hypothetical interval check, applied to the full catalogue.
              </p>
            </div>
          </div>
          <div className="batch-controls">
            <label>
              Start · included
              <input
                type="date"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                }}
              />
            </label>
            <label>
              End · excluded
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <button
              className="button primary"
              disabled={batchBusy || !index || !start || !end || start >= end}
              onClick={async () => {
                setBatchBusy(true);
                setError("");
                try {
                  const rows = await runBatch(start, end);
                  if (rows.some((r) => r.status === "INVALID_INPUT"))
                    throw new Error(
                      "Choose valid calendar dates, with start before end.",
                    );
                  setBatch(rows);
                  setEvaluatedInterval({ start, end });
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Batch check failed.",
                  );
                } finally {
                  setBatchBusy(false);
                }
              }}
            >
              {batchBusy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <ShieldCheck size={17} />
              )}{" "}
              {batchBusy
                ? "Checking the full archive…"
                : "Run all-source check"}
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {batch && (
            <div className="batch-result" role="status">
              <div>
                <strong>{batch.length.toLocaleString()}</strong>
                <span>sources checked</span>
              </div>
              <div>
                <strong className="red-text">
                  {batch.filter((r) => r.count > 0).length.toLocaleString()}
                </strong>
                <span>have detections in interval</span>
              </div>
              <div>
                <strong>
                  {batch.filter((r) => r.count === 0).length.toLocaleString()}
                </strong>
                <span>have no matching records</span>
              </div>
              <button className="button secondary" onClick={exportBatch}>
                <Download size={16} /> Export results
              </button>
              <p>
                {evaluatedInterval?.start} included → {evaluatedInterval?.end}{" "}
                excluded. Original ZIP hash checked before parsing. No matching
                records does not establish zero emissions.
              </p>
            </div>
          )}
        </section>
      </details>
    </>
  );
}
