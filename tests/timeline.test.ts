import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Timeline from "../apps/web/src/Timeline.tsx";
import type { PlumeRecord } from "../packages/core/index.ts";
function record(rate: string): PlumeRecord {
  return {
    id: "test-positive-detection",
    sourceId: "TEST_S_001",
    acquired: "2026-05-20T08:00:00",
    satellite: "test sensor",
    rate,
    std: "",
    lat: "0",
    lon: "0",
    raw: {},
  };
}
function draw(rate: string) {
  return renderToStaticMarkup(
    createElement(Timeline, {
      records: [record(rate)],
      start: "2026-05-01",
      end: "2026-06-02",
      onSelect: () => {},
    }),
  );
}
describe("detection timeline scientific meaning", () => {
  it("a detection without a rate is labelled unquantified outside the rate axis", () => {
    const html = draw("");
    expect(html).toContain("Rate not reported");
    expect(html).toContain("unquantified-rail");
    expect(html).toContain("View 2026-05-20 test sensor record");
  });
  it("an explicitly reported zero rate remains a record on the quantified axis", () => {
    const html = draw("0");
    expect(html).not.toContain("unquantified-rail");
    expect(html).toContain("View 2026-05-20 test sensor record");
  });
});
