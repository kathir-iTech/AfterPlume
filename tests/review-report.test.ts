import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parsePacket } from "../packages/core/index.ts";
import { renderReviewReport } from "../apps/web/src/review-report.ts";

const original = parsePacket(await readFile(new URL("../public-data/examples/valid-review.json", import.meta.url), "utf8"));

describe("portable reading report", () => {
  it("escapes untrusted statements, references, decisions and original record strings", () => {
    const p = structuredClone(original);
    const attack = '</p><img src=x onerror="alert(1)"><script>alert(2)</script>';
    p.payload.claim.text = attack;
    p.payload.claim.reference = attack;
    p.payload.response.explanation = attack;
    p.payload.response.revisedText = attack;
    p.payload.records[0].satellite = attack;
    const html = renderReviewReport(p);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("form-action 'none'");
  });

  it("retains all observations and fingerprints without claiming a verification certificate", () => {
    const html = renderReviewReport(original);
    for (const r of original.payload.records) expect(html).toContain(r.id);
    expect(html).toContain(original.digest);
    expect(html).toContain(original.payload.snapshot.sha256);
    expect(html).toContain("not a verification certificate");
    expect(html).toContain("Practice statement.");
    expect(html).toContain("No external blockchain commitment attached");
  });

  it("distinguishes an unfinished decision, missing quantification and an explicit zero", () => {
    const p = structuredClone(original);
    p.payload.response = { action: "pending", explanation: "", revisedText: "" };
    p.payload.records[0].rate = "";
    p.payload.records[1].rate = "0";
    p.payload.claim.hypothetical = false;
    const html = renderReviewReport(p);
    expect(html).toContain("Draft — decision pending");
    expect(html).toContain("This review is unfinished");
    expect(html).toContain("Not quantified");
    expect(html).toContain("<td>0</td>");
    expect(html).not.toContain("<strong>Practice statement.</strong>");
  });
});
