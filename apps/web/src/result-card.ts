import type { Packet } from "../../../packages/core/index.ts";
export function downloadResultCard(packet: Packet) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx)
    throw new Error(
      "This browser cannot generate a result card. Export the JSON packet instead.",
    );
  ctx.fillStyle = "#09111b";
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = "#c4ed8b";
  ctx.font = "bold 27px system-ui";
  ctx.fillText("AfterPlume", 55, 63);
  ctx.fillStyle = "#9aacbc";
  ctx.font = "16px system-ui";
  ctx.fillText("REPLAYABLE METHANE EVIDENCE REVIEW", 55, 108);
  ctx.fillStyle = "#e9f0f6";
  ctx.font = "bold 43px system-ui";
  ctx.fillText(packet.payload.claim.sourceId, 55, 176);
  ctx.fillStyle = "#9aacbc";
  ctx.font = "20px system-ui";
  ctx.fillText(
    `${packet.payload.claim.start} included → ${packet.payload.claim.end} excluded`,
    55,
    215,
  );
  ctx.fillStyle =
    packet.payload.finding.status === "DETECTION_RECORDED"
      ? "#ff736d"
      : "#edc47d";
  ctx.font = "bold 115px system-ui";
  ctx.fillText(String(packet.payload.records.length), 55, 350);
  ctx.fillStyle = "#e9f0f6";
  ctx.font = "25px system-ui";
  ctx.fillText("matching detection records", 240, 306);
  ctx.font = "18px system-ui";
  ctx.fillText(packet.payload.finding.status.replaceAll("_", " "), 240, 340);
  ctx.fillStyle = "#9aacbc";
  ctx.font = "17px system-ui";
  ctx.fillText(
    "Hypothetical statement · physical mitigation not assessed",
    55,
    400,
  );
  ctx.strokeStyle = "#293848";
  ctx.beginPath();
  ctx.moveTo(55, 439);
  ctx.lineTo(1145, 439);
  ctx.stroke();
  ctx.font = "15px monospace";
  ctx.fillStyle = "#9aacbc";
  ctx.fillText(`Snapshot: ${packet.payload.snapshot.id}`, 55, 479);
  ctx.fillText(`Digest: ${packet.digest}`, 55, 511);
  ctx.fillStyle = "#c4ed8b";
  ctx.font = "bold 20px system-ui";
  ctx.fillText("afterplume.vercel.app/verify", 55, 577);
  ctx.fillStyle = "#9aacbc";
  ctx.font = "14px system-ui";
  ctx.fillText(
    "Export the JSON and replay before trusting this summary.",
    610,
    577,
  );
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `afterplume-${packet.payload.claim.sourceId}-result.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
