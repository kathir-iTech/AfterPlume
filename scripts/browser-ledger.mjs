import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const rpc = "http://127.0.0.1:8545";
const addresses = await fetch(rpc, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_accounts",
    params: [],
  }),
}).then((r) => r.json());
if (!addresses.result?.length)
  throw new Error("Start and deploy the disposable local registry first.");
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? "chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(
  ({ rpc }) => {
    window.__testActor = 0;
    let id = 0;
    window.ethereum = {
      request: async ({ method, params }) => {
        const accounts =
          method === "eth_accounts" || method === "eth_requestAccounts";
        const response = await fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: ++id,
            method: accounts ? "eth_accounts" : method,
            params: accounts ? [] : (params ?? []),
          }),
        });
        const json = await response.json();
        if (json.error) throw new Error(json.error.message);
        return accounts ? [json.result[window.__testActor]] : json.result;
      },
    };
  },
  { rpc },
);
await page.goto(
  new URL("/review", process.env.BASE_URL ?? "http://127.0.0.1:5173").href,
);
await page.getByRole("button", { name: "Run evidence check" }).click();
await page.getByText("Correct or narrow", { exact: true }).click();
await page
  .getByLabel("Your explanation")
  .fill(
    "Hypothetical demonstration response: the evidence contains three detections and mitigation is unassessed.",
  );
await page
  .getByLabel("Corrected statement")
  .fill("Three detections are recorded. Field follow-up is needed.");
await page.getByRole("button", { name: "Complete this review" }).click();
await page
  .getByText("Statement corrected or narrowed", { exact: true })
  .waitFor();
await page.getByText("More actions", { exact: true }).click();
await page
  .getByRole("button", { name: "Optional blockchain publication" })
  .click();
await page.getByRole("button", { name: "Publish completed review" }).click();
await page
  .getByRole("button", { name: "Commitment attached" })
  .waitFor({ timeout: 60000 });
await page
  .getByLabel("Reviewer address · owner authorizes")
  .fill(addresses.result[1]);
await page
  .getByRole("button", { name: "Authorize reviewer", exact: true })
  .click();
await page
  .getByText(/Reviewer authorization recorded/)
  .waitFor({ timeout: 60000 });
await page.evaluate(() => {
  window.__testActor = 1;
});
await page
  .getByLabel("Review acknowledgement · reviewer submits")
  .fill(
    "Hypothetical test reviewer: I checked this exact packet and its limitations.",
  );
await page
  .getByRole("button", { name: "Acknowledge current revision" })
  .click();
await page.getByText(/Acknowledgement recorded/).waitFor({ timeout: 60000 });
await page.evaluate(() => {
  window.__testActor = 0;
});
await page.getByRole("button", { name: "Start next revision" }).click();
await page.getByText("Retain with explanation", { exact: true }).click();
await page
  .getByLabel("Your explanation")
  .fill(
    "A revised hypothetical review retains the statement while preserving the evidence conflict.",
  );
await page.getByRole("button", { name: "Complete this review" }).click();
await page.getByRole("button", { name: "Publish completed review" }).click();
await page
  .getByRole("button", { name: "Commitment attached" })
  .waitFor({ timeout: 60000 });
await page
  .getByText(/Commitment matches.*No current acknowledgement/)
  .last()
  .waitFor();
await page.getByRole("button", { name: "Withdraw ledger case" }).click();
await page.getByText(/Case withdrawal recorded/).waitFor({ timeout: 60000 });
const result = {
  generated: new Date().toISOString(),
  scope:
    "Browser UI → injected test wallet adapter → actual disposable local Hardhat JSON-RPC → compiled ReviewRegistry → receipt and state readback. Adapter uses unlocked local test accounts only, no live wallet or keys.",
  checks: [
    "publish exact digest",
    "authorize distinct reviewer",
    "reviewer acknowledgement",
    "publish sequential revision",
    "old acknowledgement not current",
    "terminal owner withdrawal",
  ],
  status: "PASS",
};
await writeFile(
  new URL("../evaluation/results/browser-ledger.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
