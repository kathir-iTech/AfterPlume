import { useState } from "react";
import type { PlumeRecord } from "../../../packages/core/index.ts";
export default function Timeline({
  records,
  start,
  end,
  onSelect,
}: {
  records: PlumeRecord[];
  start: string;
  end: string;
  onSelect: (id: string) => void;
}) {
  const [focus, setFocus] = useState<PlumeRecord>();
  const [zoom, setZoom] = useState(true);
  const dates = records
    .map((r) => Date.parse(r.acquired.slice(0, 10)))
    .filter(Number.isFinite);
  const a = Date.parse(start),
    b = Date.parse(end);
  const intervalValid = Number.isFinite(a) && Number.isFinite(b) && b > a;
  const min =
    zoom && intervalValid
      ? a - (b - a) * 0.15
      : Math.min(...dates, Number.isFinite(a) ? a : Date.now());
  const max =
    zoom && intervalValid
      ? b + (b - a) * 0.15
      : Math.max(...dates, Number.isFinite(b) ? b : min + 86400000);
  const span = Math.max(max - min, 86400000);
  const x = (n: number) => 56 + ((n - min) / span) * 564;
  const visible = records.filter(
    (r) =>
      Date.parse(r.acquired.slice(0, 10)) >= min &&
      Date.parse(r.acquired.slice(0, 10)) <= max,
  );
  const ceiling = Math.max(1000, ...visible.map((r) => Number(r.rate) || 0));
  const quantified = (r: PlumeRecord) =>
    r.rate.trim() !== "" && Number.isFinite(Number(r.rate));
  const hasUnquantified = visible.some((r) => !quantified(r));
  const y = (r: PlumeRecord) =>
    quantified(r) ? 182 - (Number(r.rate) / ceiling) * 138 : 275;
  const formatDate = (n: number) => new Date(n).toISOString().slice(5, 10);
  return (
    <div className="observation-timeline">
      <div className="timeline-toolbar">
        <span>
          <i /> In claim interval
        </span>
        <button onClick={() => setZoom(!zoom)}>
          {zoom ? "Show full history" : "Focus on interval"}
        </button>
      </div>
      <svg
        viewBox={hasUnquantified ? "0 0 660 297" : "0 0 660 245"}
        role="img"
        aria-label={`Interactive detection timeline, ${start} to ${end}`}
      >
        <rect
          x="56"
          y="22"
          width="564"
          height="170"
          rx="6"
          fill="var(--surface-alt)"
        />
        {intervalValid && (
          <rect
            x={Math.max(56, x(a))}
            y="22"
            width={Math.max(0, Math.min(620, x(b)) - Math.max(56, x(a)))}
            height="170"
            fill="var(--red-soft)"
          />
        )}
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line
              x1="56"
              x2="620"
              y1={192 - t * 148}
              y2={192 - t * 148}
              stroke="var(--line)"
            />
            <text x="49" y={196 - t * 148} textAnchor="end">
              {new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(t * ceiling)}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={56 + t * 564}
              x2={56 + t * 564}
              y1="192"
              y2="199"
              stroke="var(--muted)"
            />
            <text x={56 + t * 564} y="216" textAnchor="middle">
              {formatDate(min + t * span)}
            </text>
          </g>
        ))}
        <text x="56" y="13">
          kg/h · instantaneous
        </text>
        <text x="620" y="239" textAnchor="end">
          {new Date(min).getUTCFullYear()}–{new Date(max).getUTCFullYear()} ·
          provider dates
        </text>
        {hasUnquantified && (
          <g className="unquantified-rail">
            <rect
              x="56"
              y="252"
              width="564"
              height="39"
              rx="5"
              fill="var(--surface-alt)"
            />
            <text x="60" y="268">
              Rate not reported
            </text>
          </g>
        )}
        {visible.map((r, i) => {
          const active =
            r.acquired.slice(0, 10) >= start && r.acquired.slice(0, 10) < end;
          return (
            <g
              key={r.id}
              tabIndex={0}
              role="button"
              aria-label={`View ${r.acquired.slice(0, 10)} ${r.satellite} record`}
              onFocus={() => setFocus(r)}
              onBlur={() => setFocus(undefined)}
              onMouseEnter={() => setFocus(r)}
              onMouseLeave={() => setFocus(undefined)}
              onClick={() => onSelect(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(r.id);
                }
              }}
            >
              <circle
                cx={x(Date.parse(r.acquired.slice(0, 10)))}
                cy={y(r)}
                r="13"
                fill="transparent"
              />
              <circle
                className="timeline-point"
                style={{ animationDelay: `${Math.min(i, 15) * 50}ms` }}
                cx={x(Date.parse(r.acquired.slice(0, 10)))}
                cy={y(r)}
                r={focus?.id === r.id ? 7 : 5}
                fill={active ? "var(--red)" : "var(--teal)"}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      <div className="timeline-tooltip" aria-live="polite">
        {focus ? (
          <>
            <strong>
              {focus.acquired.slice(0, 10)} · {focus.satellite.split(" - ")[0]}
            </strong>
            <span>
              {focus.rate
                ? `${Number(focus.rate).toLocaleString()} kg/h`
                : "Rate not reported"}
              {focus.std ? ` · σ ${Number(focus.std).toLocaleString()}` : ""}
            </span>
          </>
        ) : (
          <span>
            {visible.length
              ? "Hover, focus or click a detection to inspect the original record."
              : "No recorded detections in this view. Try the full history."}
          </span>
        )}
      </div>
    </div>
  );
}
