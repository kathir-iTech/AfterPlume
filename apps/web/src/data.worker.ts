import {
  evaluateClaim,
  readKnownSnapshot,
  type PlumeRecord,
} from "../../../packages/core/index.ts";
let snapshot: ReturnType<typeof readKnownSnapshot> | undefined;
let grouped: Map<string, PlumeRecord[]> | undefined;
self.onmessage = async (event: MessageEvent) => {
  const { id, sourceId, start, end, batch } = event.data;
  try {
    snapshot ??= (async () => {
      const response = await fetch("/data/mars-snapshot.zip");
      if (!response.ok)
        throw new Error(
          "The trusted source archive could not be loaded. Try again.",
        );
      return readKnownSnapshot(new Uint8Array(await response.arrayBuffer()));
    })();
    const data = await snapshot;
    if (!grouped) {
      grouped = new Map();
      for (const record of data.records) {
        const list = grouped.get(record.sourceId) ?? [];
        list.push(record);
        grouped.set(record.sourceId, list);
      }
      for (const list of grouped.values())
        list.sort(
          (a, b) =>
            a.acquired.localeCompare(b.acquired) || a.id.localeCompare(b.id),
        );
    }
    if (batch) {
      const results = [...data.sourceIds].sort().map((sourceId) => {
        const finding = evaluateClaim(
          {
            sourceId,
            start,
            end,
            text: "Hypothetical: no detections recorded in this interval.",
            kind: "no_detections",
            hypothetical: true,
            timeBasis: "provider-calendar-date",
          },
          grouped!.get(sourceId) ?? [],
        );
        return {
          sourceId,
          status: finding.status,
          count: finding.recordIds.length,
        };
      });
      self.postMessage({ id, results });
    } else {
      if (!data.sourceIds.has(sourceId))
        throw new Error(
          "This source ID is not in the pinned snapshot. Choose a source in the explorer.",
        );
      self.postMessage({ id, records: grouped.get(sourceId) ?? [] });
    }
  } catch (error) {
    snapshot = undefined;
    self.postMessage({
      id,
      error:
        error instanceof Error
          ? error.message
          : "Snapshot could not be checked.",
    });
  }
};
