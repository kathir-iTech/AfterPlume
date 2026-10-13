import { test, expect } from "@playwright/test";
test("failed model downloads preserve accepted keyword provenance", async ({
  page,
  context,
}) => {
  await context.route("**/models/**", (route) => route.abort());
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page
    .getByLabel("Statement to review")
    .fill(
      "Methane emissions reduced by 45% compared with a measured baseline.",
    );
  await page
    .getByRole("button", { name: "Suggest a claim type locally" })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByText("Local assistance details", { exact: false }).click();
  await expect(page.getByText(/Local model unavailable/)).toBeVisible();
  await expect(page.getByLabel("Confirmed claim type")).toHaveValue(
    "reduction_percent",
  );
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "More evidence needed", exact: true }),
  ).toBeVisible();
  const event = page.waitForEvent("download");
  await page.getByText("More actions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Export evidence draft", exact: true })
    .click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const packet = JSON.parse(Buffer.concat(chunks).toString());
  expect(packet.payload.assistance).toMatchObject({
    engine: "lexical",
    suggestedKind: "reduction_percent",
    confirmedByHuman: true,
  });
  expect(packet.payload.assistance.guidanceIds).toHaveLength(3);
});
test("result card exports a real PNG summary of the current review", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  const event = page.waitForEvent("download");
  await page.getByText("More actions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Download result card", exact: true })
    .click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("afterplume-AZE_S_010-result.png");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const png = Buffer.concat(chunks);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
test("explorer opens a different real source and keeps its review revision separate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await page.getByText("Correct or narrow", { exact: true }).click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "These are three actual recorded observations, with mitigation still unassessed.",
    );
  await page
    .getByLabel("Corrected statement")
    .fill("Three detections are recorded in this snapshot.");
  await page.getByRole("button", { name: "Complete this review" }).click();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Search sources").fill("AUS_S_010");
  await expect(page.locator(".source-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Review AUS_S_010", exact: true })
    .click();
  await expect(page.locator(".source-summary")).toContainText("AUS_S_010");
  await expect(page.locator(".source-summary")).toContainText("Australia");
  await page
    .getByLabel("Statement to review")
    .fill("No detections were recorded during the selected interval.");
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "Detection recorded", exact: true }),
  ).toBeVisible();
  await page.getByText("Retain with explanation", { exact: true }).click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "This hypothetical statement conflicts with a recorded detection. No operator claim is alleged.",
    );
  await page.getByRole("button", { name: "Complete this review" }).click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export review", exact: true })
    .click();
  expect((await event).suggestedFilename()).toBe(
    "afterplume-AUS_S_010-r1.json",
  );
  await page.getByRole("button", { name: /Review history/ }).click();
  await expect(page.locator(".history-row")).toHaveCount(2);
  await expect(
    page.locator(".history-row").filter({ hasText: "AZE_S_010" }),
  ).toContainText("Latest for source");
  await expect(
    page.locator(".history-row").filter({ hasText: "AUS_S_010" }),
  ).toContainText("Latest for source");
  expect(errors).toEqual([]);
});
test("proof lab performs actual replay and catches a freshly rehashed omission", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Watch the proof", exact: true })
    .click();
  await expect(page).toHaveURL(/\/proof$/);
  await expect(
    page.locator(".proof-packet.original .proof-checks"),
  ).toContainText("MATCH");
  await expect(
    page.locator(".proof-packet.edited .proof-checks .mismatch"),
  ).toContainText("MISMATCH");
  await expect(
    page.locator(".proof-packet.edited .proof-checks"),
  ).toContainText("MATCH");
  await expect(page.locator(".proof-count").first()).toContainText("3");
  await expect(page.locator(".proof-count").last()).toContainText("2");
  await page
    .getByText("Inspect the files and technical checks", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "See registry lifecycle evidence" })
    .click();
  await expect(
    page.getByText("local, resettable EVM", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".lifecycle-grid h3")).toHaveCount(6);
});
test("all-source batch runs against the archive and exports reproducible rows", async ({
  page,
}) => {
  await page.goto("/explore");
  await page
    .getByText("Check an interval across all sources", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run all-source check", exact: true })
    .click();
  await expect(page.locator(".batch-result")).toContainText("4,211");
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export results", exact: true })
    .click();
  const download = await event;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString();
  expect(csv.split("\n")).toHaveLength(4212);
  expect(csv).toContain("AZE_S_010,2026-05-01,2026-06-02,3,DETECTION_RECORDED");
});
test("cold assistance provides an immediate human-confirmable suggestion", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Suggest a claim type locally" })
    .click();
  await expect(
    page.getByText("Keyword suggestion · ready now", { exact: true }),
  ).toBeVisible({ timeout: 3000 });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run evidence check" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "Detection recorded", exact: true }),
  ).toBeVisible();
});
test("mobile explorer and reduced-motion proof remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Watch the proof", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Search sources").fill("not-a-real-source");
  await expect(
    page.getByRole("heading", { name: "No sources match those filters." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Watch the proof", exact: true })
    .click();
  await expect(page.locator(".proof-packet.edited .mismatch")).toContainText(
    "MISMATCH",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
