import { test, expect } from "@playwright/test";
test("real snapshot → human response → export → independent replay → omission attack", async ({
  page,
}) => {
  await page.goto("/review");
  await expect(
    page.getByRole("heading", { name: "Bound the statement" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "Detection recorded" }),
  ).toBeVisible();
  await expect(
    page.getByText("3 matching records", { exact: true }),
  ).toBeVisible();
  await page.getByText("Correct or narrow", { exact: true }).click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "Three observations occur in the interval. Field evidence is needed to assess mitigation.",
    );
  await page
    .getByLabel("Corrected statement")
    .fill(
      "Three detection records exist in this snapshot. Mitigation is unassessed.",
    );
  await page.getByRole("button", { name: "Complete this review" }).click();
  await expect(
    page.getByText("Statement corrected or narrowed", { exact: true }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export review", exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain("r1.json");
  await page.getByRole("button", { name: "Replay this review" }).click();
  await expect(page.locator(".verification-check.match")).toHaveCount(2);
  await expect(page.locator(".verification-check.not_established")).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Omit a record & rehash" }).click();
  await expect(page.locator(".verification-check.match")).toHaveCount(1);
  await expect(page.locator(".verification-check.mismatch")).toHaveCount(1);
});
test("no detections is bounded and mobile layout stays usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/review");
  await page.getByLabel("Start · included").fill("2026-07-01");
  await page.getByLabel("End · excluded").fill("2026-08-01");
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "No matching records", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Not assessed", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("local AI computes query embeddings without a paid API", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Suggest a claim type locally" })
    .click();
  await expect(
    page.getByText(/384-dimensional embeddings computed locally/),
  ).toBeVisible({ timeout: 200000 });
  await expect(
    page.getByText("Suggested type", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("heading", { name: "Detection recorded" }),
  ).toBeVisible();
});
