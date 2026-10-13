import { expect, it } from "vitest";
import { readWorkspace } from "../apps/web/src/workspace.ts";
it("incomplete human inputs are preserved as drafts", () => {
  const value = {
    claim: {
      text: "A statement still being written",
      sourceId: "",
      start: "",
      end: "",
      kind: "no_detections",
      hypothetical: false,
      timeBasis: "provider-calendar-date",
    },
    response: { action: "pending", explanation: "", revisedText: "" },
    assistance: {
      engine: "none",
      model: "",
      modelRevision: "",
      suggestedKind: null,
      confirmedByHuman: true,
      guidanceIds: [],
    },
    packet: null,
    updated: "2026-10-13T00:00:00Z",
  };
  expect(readWorkspace({ getItem: () => JSON.stringify(value) })).toEqual(
    value,
  );
});
it("malformed or inaccessible browser storage cannot crash the workspace", () => {
  expect(readWorkspace({ getItem: () => "{broken" })).toBeUndefined();
  expect(
    readWorkspace({
      getItem: () => {
        throw new Error("disabled");
      },
    }),
  ).toBeUndefined();
  expect(
    readWorkspace({
      getItem: () => JSON.stringify({ claim: { text: "bad" } }),
    }),
  ).toBeUndefined();
});
