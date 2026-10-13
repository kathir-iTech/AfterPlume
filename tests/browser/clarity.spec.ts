import { test, expect } from "@playwright/test";
test("changing a statement during archive loading cannot show the old finding", async ({
  page,
  context,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await context.route("**/data/source-index.json", (route) => route.abort());
  await context.route("**/data/mars-snapshot.zip.gz", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page.getByLabel("Exact provider source ID").fill("AUS_S_010");
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await started;
  await page
    .getByLabel("Statement to review")
    .fill("A new statement awaiting a fresh review.");
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/data/mars-snapshot.zip.gz"),
  );
  release();
  await response;
  await expect(
    page.getByRole("heading", { name: "Statement and dates" }),
  ).toBeVisible();
  await expect(page.locator(".focused-finding")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Run evidence check" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(page.locator(".focused-finding")).toBeVisible();
  await expect(page.locator(".source-summary")).toContainText("AUS_S_010");
  await expect(
    page.getByRole("heading", { name: "Check the claim inputs", exact: true }),
  ).toHaveCount(0);
});
test("first visit has one primary action and no catalogue or batch form", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".home-observation-count")).toContainText("3");
  await expect(page.locator("main .button.primary")).toHaveCount(1);
  await expect(page.getByLabel("Search sources")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Run all-source check" }),
  ).toHaveCount(0);
  const words = (await page.locator("main").innerText())
    .trim()
    .split(/\s+/).length;
  expect(words).toBeLessThan(100);
  await page
    .getByRole("button", { name: "Find a source", exact: true })
    .click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Watch the proof", exact: true })
    .click();
  await expect(page.locator(".proof-packet.edited .mismatch")).toContainText(
    "MISMATCH",
  );
  const box = await page
    .locator(".proof-packet.edited .mismatch")
    .boundingBox();
  expect(box!.y + box!.height).toBeLessThan(1000);
});
test("secondary navigation is keyboard accessible and preserves deep links", async ({
  page,
}) => {
  await page.goto("/");
  const more = page.locator(".more-menu>summary");
  await more.focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("button", { name: "About AfterPlume", exact: true })
    .click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(
    page.getByRole("heading", { name: "Check before you cite." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Check before you cite." }),
  ).toBeVisible();
  await more.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.locator(".more-menu")).not.toHaveAttribute("open");
});
test("an exported file can be imported and automatically checked", async ({
  page,
}) => {
  await page.goto("/review");
  await page
    .getByRole("button", { name: "Use a practice statement", exact: true })
    .click();
  await page.getByRole("button", { name: "Run evidence check" }).click();
  await expect(
    page.getByRole("button", { name: "Export review", exact: true }),
  ).toHaveCount(0);
  await page.getByText("Retain with explanation", { exact: true }).click();
  await page
    .getByLabel("Your explanation")
    .fill(
      "The practice statement is retained here to exercise file verification.",
    );
  await page.getByRole("button", { name: "Complete this review" }).click();
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export review", exact: true })
    .click();
  const file = await event;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  await page.goto("/verify");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "review.json",
      mimeType: "application/json",
      buffer: Buffer.concat(chunks),
    });
  await expect(page.locator(".verification-check.match")).toHaveCount(2);
});
