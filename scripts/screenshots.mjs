import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const root = new URL("../docs/screenshots/", import.meta.url);
await mkdir(root, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
await page.goto(process.env.BASE_URL ?? "http://127.0.0.1:5173");
await page.getByRole("heading", { name: "Bound the statement" }).waitFor();
await page.screenshot({
  path: new URL("01-review-desk.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await page.getByRole("button", { name: "Run evidence check" }).click();
await page.getByRole("heading", { name: "Detection recorded" }).waitFor();
await page.screenshot({
  path: new URL("02-evidence-finding.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await page.getByText("Correct or narrow", { exact: true }).click();
await page
  .getByLabel("Your explanation")
  .fill(
    "Three source-assigned detections fall within this interval. Satellite records do not establish whether a repair occurred; mitigation needs field follow-up.",
  );
await page
  .getByLabel("Corrected statement")
  .fill(
    "Three detections are recorded in this snapshot and interval. Physical mitigation remains unassessed.",
  );
await page.getByRole("button", { name: "Complete this review" }).click();
await page
  .getByText("Statement corrected or narrowed", { exact: true })
  .waitFor();
await page.screenshot({
  path: new URL("03-human-response.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await page.getByRole("button", { name: "Replay this review" }).click();
await page.locator(".verification-check.match").last().waitFor();
await page.screenshot({
  path: new URL("04-source-replay.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await page.getByRole("button", { name: "Omit a record & rehash" }).click();
await page.locator(".verification-check.mismatch").waitFor();
await page.screenshot({
  path: new URL("05-omission-detected.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await page.getByRole("button", { name: "Review desk", exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: new URL("06-mobile-review.png", root).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  ),
  fullPage: true,
});
await browser.close();
console.log("Six screenshots captured from the working application.");
