import type { SnapshotManifest } from "../../../packages/core/index.ts";
export type Source = {
  id: string;
  country: string;
  sector: string;
  lat: string;
  lon: string;
  count: number;
  first: string;
  latest: string;
};
export type SourceIndex = {
  manifest: SnapshotManifest;
  sources: Source[];
  unassignedRecords: number;
};
export type BatchRow = { sourceId: string; status: string; count: number };
