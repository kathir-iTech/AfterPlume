import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(
  new URL("/review", process.env.BASE_URL ?? "http://127.0.0.1:5173").href,
);
await page.getByRole("heading", { name: "Bound the statement" }).waitFor();
const coldStarted = performance.now();
await page
  .getByRole("button", { name: "Suggest a claim type locally" })
  .click();
await page
  .getByText(/384-dimensional embeddings computed locally/)
  .waitFor({ timeout: 200000 });
const coldUiMilliseconds = performance.now() - coldStarted;
const warm = [];
for (let i = 0; i < 20; i++) {
  await page
    .getByLabel("Statement to review")
    .fill(
      `No methane detections were recorded for this source during the interval. Review request ${i}.`,
    );
  const started = performance.now();
  await page
    .getByRole("button", { name: "Suggest a claim type locally" })
    .click();
  await page
    .getByText(/384-dimensional embeddings computed locally/)
    .waitFor({ timeout: 30000 });
  const status = await page.locator(".ai-status").textContent();
  warm.push({
    run: i + 1,
    uiMilliseconds: performance.now() - started,
    inferenceMilliseconds: Number(status.match(/· (\d+) ms/)[1]),
  });
}
const times = warm.map((r) => r.uiMilliseconds).sort((a, b) => a - b);
const device = await page.evaluate(() => ({
  userAgent: navigator.userAgent,
  hardwareConcurrency: navigator.hardwareConcurrency,
  deviceMemoryGiB: navigator.deviceMemory ?? null,
}));
const report = {
  generated: new Date().toISOString(),
  runtime: "Chrome browser, ONNX Runtime WASM, one thread, local Vite server",
  scope:
    "Cold local assistance includes model/runtime loading and reference embeddings. Warm UI duration includes Playwright polling and rendering; rounded inference duration is reported separately. No human task-completion or emissions-impact measurement.",
  device,
  coldUiMilliseconds,
  warmUi: { count: 20, p50: times[9], p95: times[18] },
  warm,
  pageErrors: errors,
};
await mkdir(new URL("../evaluation/results/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../evaluation/results/browser.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, warm: undefined }, null, 2));
await browser.close();
