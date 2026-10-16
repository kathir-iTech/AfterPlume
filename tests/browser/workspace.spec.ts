import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";

test("a completed review produces a standalone readable report without executing pasted text", async ({ page, context }, testInfo) => {
  await page.goto("/review");
  await page.getByRole("button", { name: "Use a practice statement", exact: true }).click();
  const attack = '<img src="https://example.invalid/leak" onerror="window.reportInjected=true"><script>window.reportInjected=true</script>';
  await page.getByLabel("Statement to review").fill(`No methane detections were recorded. ${attack}`);
  await page.getByLabel("Statement reference").fill("Practice document, page 2");
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(page.locator(".finding-count")).toContainText("3");
  await page.getByText("Correct or narrow", { exact: true }).click();
  await page.getByLabel("Your explanation").fill("Three observations match the interval; mitigation is not assessed.");
  await page.getByLabel("Corrected statement").fill("Three detections are recorded in the selected snapshot and interval.");
  await page.getByRole("button", { name: "Complete this review" }).click();
  await page.getByText("More actions", { exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download readable report", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("afterplume-AZE_S_010-r1-report.html");
  const path = testInfo.outputPath("readable-report.html");
  await download.saveAs(path);
  const report = await context.newPage();
  const requests: string[] = [];
  report.on("request", (r) => { if (r.url().startsWith("http")) requests.push(r.url()); });
  await report.goto(pathToFileURL(path).href);
  await expect(report.getByRole("heading", { name: "AZE_S_010", exact: true })).toBeVisible();
  await expect(report.locator("tbody tr")).toHaveCount(3);
  await expect(report.getByText("Practice document, page 2", { exact: true })).toBeVisible();
  await expect(report.locator("main")).toContainText(attack);
  await expect(report.locator("img,script")).toHaveCount(0);
  expect(await report.evaluate(() => (window as unknown as { reportInjected?: boolean }).reportInjected)).toBeUndefined();
  expect(requests).toEqual([]);
  await report.close();
});

test("narrow screens keep the source table's horizontal scrolling inside its container", async ({page}) => {
  await page.setViewportSize({width:320,height:800});
  for (const route of ["/", "/explore", "/review", "/reviews", "/verify"]) {
    await page.goto(route);
    await expect(page.locator(".topbar")).toBeVisible();
    if (route === "/explore") {
      await expect(page.locator(".source-table tbody tr").first()).toBeVisible();
      expect(await page.locator(".source-table-wrap").evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
});

test("a modified saved packet is rejected before its finding is shown again", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(page.locator(".finding-count")).toContainText("3");
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("afterplume-workspace-v1")!);
    saved.packet.payload.records.pop();
    localStorage.setItem("afterplume-workspace-v1", JSON.stringify(saved));
  });
  await page.reload();
  await expect(
    page.getByText(
      "Saved evidence could not be verified. Your inputs are restored; run a fresh check.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".focused-finding")).toHaveCount(0);
  await expect(page.getByLabel("Statement to review")).toHaveValue(
    /No methane detections/,
  );
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(page.locator(".finding-count")).toContainText("3");
});

test("a user's own statement and unfinished decision survive reload and become a portable review", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find a source", exact: true })
    .click();
  await page.getByLabel("Search sources").fill("LBY_S_119");
  await page
    .getByRole("button", { name: "Review LBY_S_119", exact: true })
    .click();
  await expect(page.getByLabel("Statement to review")).toHaveValue("");
  await expect(
    page.getByLabel("This is a practice statement"),
  ).not.toBeChecked();
  await page
    .getByLabel("Statement to review")
    .fill(
      "No methane detections were recorded on 3 February 2026 for this source.",
    );
  await page.getByLabel("Statement reference").fill("Test document, page 7");
  await page.getByLabel("Start · included").fill("2026-02-03");
  await page.getByLabel("End · excluded").fill("2026-02-04");
  await page.reload();
  await expect(page.getByLabel("Statement reference")).toHaveValue(
    "Test document, page 7",
  );
  await expect(
    page.getByRole("button", { name: "Run evidence check" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(page.locator(".finding-count")).toContainText("1");
  await expect(
    page.getByRole("button", { name: "Export review", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Verify this review", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Correct or narrow", { exact: true }).click();
  await page
    .getByLabel("Your explanation")
    .fill("One detection is present in the selected provider-date interval.");
  await page.getByRole("button", { name: "Complete this review" }).click();
  await expect(page.getByLabel("Corrected statement")).toBeFocused();
  await expect(page.locator("#correction-error")).toBeVisible();
  await page
    .getByLabel("Corrected statement")
    .fill(
      "One detection is recorded on 3 February; physical mitigation is not assessed.",
    );
  await page.reload();
  await expect(page.getByLabel("Corrected statement")).toHaveValue(
    /One detection is recorded/,
  );
  await page.getByRole("button", { name: "Complete this review" }).click();
  await expect(
    page.locator(".workflow-steps [aria-current=step]"),
  ).toContainText("Saved review");
  await page.getByRole("button", { name: "Your reviews", exact: true }).click();
  await expect(page.locator(".library-row")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  await expect(
    page.getByText("Statement corrected or narrowed", { exact: true }),
  ).toBeVisible();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export review", exact: true })
    .click();
  const file = await event;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream!) chunks.push(Buffer.from(c));
  const packet = JSON.parse(Buffer.concat(chunks).toString());
  expect(packet.payload.claim).toMatchObject({
    hypothetical: false,
    reference: "Test document, page 7",
    sourceId: "LBY_S_119",
  });
  expect(packet.payload.response.action).toBe("correct");
  await page
    .getByRole("button", { name: "Verify this review", exact: true })
    .click();
  await expect(page.locator(".verification-check.match")).toHaveCount(2);
  await expect(
    page.getByText("Start with a working example.", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("starting another review preserves the previous unfinished work", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page
    .getByLabel("Statement to review")
    .fill("A draft that must stay on this device.");
  await page.getByRole("button", { name: "Your reviews", exact: true }).click();
  await page.getByRole("button", { name: "New review", exact: true }).click();
  await page.getByLabel("Search sources").fill("LBY_S_119");
  await page
    .getByRole("button", { name: "Review LBY_S_119", exact: true })
    .click();
  await page
    .getByLabel("Statement to review")
    .fill("A second draft for another source.");
  await page.getByRole("button", { name: "Your reviews", exact: true }).click();
  await expect(page.locator(".workspace-draft")).toHaveCount(2);
  await page.reload();
  await page
    .locator(".workspace-draft")
    .filter({ hasText: "A draft that must stay" })
    .getByRole("button", { name: "Continue review" })
    .click();
  await expect(page.getByLabel("Statement to review")).toHaveValue(
    "A draft that must stay on this device.",
  );
});
