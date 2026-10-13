import { useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Minus, Plus } from "lucide-react";
import type { Source } from "./explorer-types.ts";
const project = (s: Source) => [
  ((Number(s.lon) + 180) / 360) * 900,
  ((85 - Number(s.lat)) / 170) * 460,
];
export default function WorldMap({
  sources,
  selected,
  onSelect,
}: {
  sources: Source[];
  selected?: Source;
  onSelect: (s: Source) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [paths, setPaths] = useState<Path2D[]>([]);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<Source>();
  const drag = useRef<
    | { x: number; y: number; originX: number; originY: number; moved: boolean }
    | undefined
  >(undefined);
  const points = useMemo(
    () =>
      sources
        .filter(
          (s) =>
            s.lat.trim() &&
            s.lon.trim() &&
            Number.isFinite(Number(s.lat)) &&
            Number.isFinite(Number(s.lon)),
        )
        .map((s) => ({ s, p: project(s) })),
    [sources],
  );
  useEffect(() => {
    let live = true;
    fetch("/data/world-land.json")
      .then((r) => {
        if (!r.ok) throw new Error("outline");
        return r.json();
      })
      .then((data) => {
        if (live) setPaths(data.paths.map((p: string) => new Path2D(p)));
      })
      .catch(() => {
        /* Sources and grid remain usable if the decorative outline is unavailable. */
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => {
      const ctx = el.getContext("2d");
      if (!ctx) return;
      const bounds = el.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(bounds.width * ratio);
      el.height = Math.round(bounds.height * ratio);
      ctx.setTransform(el.width / 900, 0, 0, el.height / 460, 0, 0);
      ctx.clearRect(0, 0, 900, 460);
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.strokeStyle = "#203244";
      ctx.lineWidth = 0.5 / view.scale;
      for (let x = 0; x <= 900; x += 75) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 460);
        ctx.stroke();
      }
      for (let y = 0; y <= 460; y += 76.66) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(900, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#182c3b";
      ctx.strokeStyle = "#355063";
      ctx.lineWidth = 0.65 / view.scale;
      for (const p of paths) {
        ctx.fill(p, "evenodd");
        ctx.stroke(p);
      }
      for (const { s, p } of points) {
        ctx.beginPath();
        ctx.arc(
          p[0],
          p[1],
          Math.min(3, 1.3 + Math.log1p(s.count) * 0.28) / view.scale,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = s.id === selected?.id ? "#ff736d" : "#bfe786";
        ctx.globalAlpha = s.id === selected?.id ? 1 : 0.68;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (selected) {
        const [x, y] = project(selected);
        ctx.strokeStyle = "#ff736d";
        ctx.lineWidth = 1.5 / view.scale;
        ctx.beginPath();
        ctx.arc(x, y, 9 / view.scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 16 / view.scale, y);
        ctx.lineTo(x + 16 / view.scale, y);
        ctx.moveTo(x, y - 16 / view.scale);
        ctx.lineTo(x, y + 16 / view.scale);
        ctx.stroke();
      }
      ctx.restore();
    };
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    draw();
    return () => observer.disconnect();
  }, [paths, points, selected, view]);
  function nearest(clientX: number, clientY: number) {
    const r = canvas.current!.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 900,
      y = ((clientY - r.top) / r.height) * 460;
    let best: Source | undefined;
    let distance = (14 * 900) / r.width;
    for (const item of points) {
      const d = Math.hypot(
        item.p[0] * view.scale + view.x - x,
        item.p[1] * view.scale + view.y - y,
      );
      if (d < distance) {
        distance = d;
        best = item.s;
      }
    }
    return best;
  }
  function zoom(factor: number) {
    setView((v) => {
      const scale = Math.max(1, Math.min(8, v.scale * factor));
      return {
        scale,
        x: 450 - ((450 - v.x) * scale) / v.scale,
        y: 230 - ((230 - v.y) * scale) / v.scale,
      };
    });
  }
  return (
    <div className="world-map">
      <div className="map-topline">
        <span>
          <i className="live-dot" /> PINNED SATELLITE SNAPSHOT
        </span>
        <span>{points.length.toLocaleString()} mapped sources</span>
      </div>
      <canvas
        ref={canvas}
        data-outline-ready={paths.length > 0}
        aria-label="World map of UNEP methane sources. Select sources with the searchable list below, or click a map point."
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            originX: view.x,
            originY: view.y,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            const d = drag.current;
            const r = e.currentTarget.getBoundingClientRect();
            const dx = ((e.clientX - d.x) * 900) / r.width,
              dy = ((e.clientY - d.y) * 460) / r.height;
            if (Math.hypot(dx, dy) > 4) d.moved = true;
            if (d.moved)
              setView((v) => ({ ...v, x: d.originX + dx, y: d.originY + dy }));
          } else setHover(nearest(e.clientX, e.clientY));
        }}
        onPointerUp={(e) => {
          if (!drag.current?.moved) {
            const s = nearest(e.clientX, e.clientY);
            if (s) onSelect(s);
          }
          drag.current = undefined;
        }}
        onPointerCancel={() => {
          drag.current = undefined;
        }}
        onPointerLeave={() => setHover(undefined)}
      />
      <div className="map-controls">
        <button aria-label="Zoom into map" onClick={() => zoom(1.6)}>
          <Plus size={17} />
        </button>
        <button aria-label="Zoom out of map" onClick={() => zoom(1 / 1.6)}>
          <Minus size={17} />
        </button>
        <button
          aria-label="Reset map view"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        >
          <LocateFixed size={17} />
        </button>
      </div>
      <div className="map-readout">
        <span>
          {hover
            ? `${hover.id} · ${hover.country}`
            : selected
              ? `${selected.id} · ${selected.country}`
              : "Select a source · drag to pan"}
        </span>
        <span>
          {hover
            ? `${hover.count} detections`
            : "Geography provides context, not ownership"}
        </span>
      </div>
    </div>
  );
}
