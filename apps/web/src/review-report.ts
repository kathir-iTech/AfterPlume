import type { Packet } from "../../../packages/core/index.ts";

const escape = (value: string | number) =>
  String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const findingLabels = {
  DETECTION_RECORDED: "Detection recorded",
  NO_MATCHING_DETECTIONS_IN_SNAPSHOT: "No matching records",
  INSUFFICIENT_OR_INCOMPATIBLE: "More evidence needed",
  INVALID_INPUT: "Invalid inputs — no conclusion",
};
const decisionLabels = {
  pending: "Draft — decision pending",
  correct: "Correct or narrow",
  retain: "Retain with explanation",
  withdraw: "Exclude from my report",
};

/** Standalone, script-free reading copy. The JSON packet remains the replayable artifact. */
export function renderReviewReport(packet: Packet): string {
  const { payload: p } = packet;
  const row = (label: string, value: string | number) =>
    `<dt>${escape(label)}</dt><dd>${escape(value)}</dd>`;
  const paragraph = (value: string) => `<p class="verbatim">${escape(value)}</p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>AfterPlume review — ${escape(p.claim.sourceId)} — r${p.revision}</title>
<style>
:root{color-scheme:light}body{font:16px/1.6 system-ui,sans-serif;color:#15232c;background:#fff;max-width:900px;margin:40px auto;padding:0 24px}h1{font-size:32px;line-height:1.15}h2{font-size:21px;margin-top:32px}header{border-bottom:2px solid #15232c;padding-bottom:20px}.status{display:inline-block;background:#edf4d9;padding:4px 10px;border-radius:4px}dl{display:grid;grid-template-columns:170px 1fr;gap:8px 16px}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}.verbatim{white-space:pre-wrap;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 6px;border-bottom:1px solid #ccd5db}th{vertical-align:bottom}td{overflow-wrap:anywhere}.scroll{overflow-x:auto}small,footer{font-size:13px;color:#465965}code{overflow-wrap:anywhere}footer{border-top:1px solid #ccd5db;margin-top:32px;padding-top:16px}a{color:#215e44}@media(max-width:550px){dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}}@media print{body{margin:0;max-width:none;font-size:11pt}h2{break-after:avoid}tr{break-inside:avoid}thead{display:table-header-group}a{color:inherit}.scroll{overflow:visible}}
</style></head><body>
<header><small>AFTERPLUME · EVIDENCE REVIEW · REVISION ${p.revision}</small>
<h1>${escape(p.claim.sourceId)}</h1>
<span class="status">${escape(decisionLabels[p.response.action])}</span>
${p.claim.hypothetical ? "<p><strong>Practice statement.</strong> This is a hypothetical exercise using real observations, not an attributed operator claim.</p>" : ""}
</header>
<main>
<h2>Statement reviewed</h2>${paragraph(p.claim.text)}
<dl>${p.claim.reference ? row("Reference supplied", p.claim.reference) : ""}${row("Start, included", p.claim.start)}${row("End, excluded", p.claim.end)}${row("Time basis", "Provider calendar dates; no timezone conversion")}</dl>
${p.claim.reference ? "<small>The reference is supplied by the reviewer; AfterPlume has not fetched or authenticated it.</small>" : ""}
<h2>${escape(findingLabels[p.finding.status])}</h2>
${paragraph(p.finding.reason)}
<p><strong>${p.records.length} matching ${p.records.length === 1 ? "record" : "records"}</strong> included in this packet. Physical mitigation is not assessed.</p>
<h2>Review decision</h2>
${p.response.explanation ? paragraph(p.response.explanation) : "<p>No explanation recorded. This review is unfinished.</p>"}
${p.response.action === "correct" && p.response.revisedText ? `<h3>Corrected statement</h3>${paragraph(p.response.revisedText)}` : ""}
<h2>Satellite observations</h2>
${p.records.length ? `<div class="scroll"><table><thead><tr><th scope="col">Provider date</th><th scope="col">Sensor</th><th scope="col">Rate (kg/h)</th><th scope="col">Reported σ (kg/h)</th><th scope="col">Record ID</th></tr></thead><tbody>${p.records.map((r) => `<tr><td>${escape(r.acquired)}</td><td>${escape(r.satellite)}</td><td>${escape(r.rate || "Not quantified")}</td><td>${escape(r.std || "Not reported")}</td><td>${escape(r.id)}</td></tr>`).join("")}</tbody></table></div>` : "<p>No matching observations included.</p>"}
<small>Rates describe individual observations. They have not been annualized or used to infer a percentage reduction.</small>
<h2>Limits</h2>
<p>Detection-only data cannot establish continuous observation, zero emissions or cessation. Source assignment does not establish facility ownership. A later detection does not establish whether a repair occurred.</p>
<ul>${p.finding.limitations.map((s) => `<li>${escape(s)}</li>`).join("")}</ul>
<h2>Reproduce this review</h2>
<p>This report is a reading copy, not a verification certificate. Export the companion JSON packet from AfterPlume and import it at <a href="https://afterplume.vercel.app/verify">afterplume.vercel.app/verify</a>. Check file integrity and source completeness separately against the pinned archive.</p>
<dl>${row("Created", p.created)}${row("Snapshot captured", p.snapshot.captured)}${row("Source rows / sources", `${p.snapshot.recordCount} / ${p.snapshot.sourceCount}`)}${row("Snapshot SHA-256", p.snapshot.sha256)}${row("Policy", p.policy.id)}${row("Policy SHA-256", p.policy.sha256)}${row("Packet SHA-256", packet.digest)}${row("Previous revision digest", p.previousDigest ?? "None")}${row("Blockchain", packet.receipt ? `Receipt attached on chain ${packet.receipt.chainId}; live verification required` : "No external blockchain commitment attached")}</dl>
</main><footer>${escape(packet.attribution)}<p>Code: MIT. Adapted source data: noncommercial, attributed, share-alike. Print this file from your browser to save a PDF.</p></footer></body></html>`;
}

export function downloadReviewReport(packet: Packet) {
  const url = URL.createObjectURL(new Blob([renderReviewReport(packet)], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `afterplume-${packet.payload.claim.sourceId.replace(/[^a-zA-Z0-9_-]/g, "_")}-r${packet.payload.revision}-report.html`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
