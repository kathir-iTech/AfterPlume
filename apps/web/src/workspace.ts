import { z } from "zod";
import {
  ClaimSchema,
  ResponseSchema,
  PayloadSchema,
  PacketSchema,
} from "../../../packages/core/index.ts";

export const WORKSPACE_KEY = "afterplume-workspace-v1";
export const DRAFTS_KEY = "afterplume-drafts-v1";
const WorkspaceSchema = z
  .object({
    // Incomplete inputs are valid drafts, but cannot enter packet verification.
    claim: ClaimSchema.extend({
      text: z.string().max(3000),
      sourceId: z.string().max(80),
      start: z.string().max(10),
      end: z.string().max(10),
    }),
    response: ResponseSchema,
    assistance: PayloadSchema.shape.assistance,
    packet: PacketSchema.nullable(),
    updated: z.string(),
  })
  .strict();
export type Workspace = z.infer<typeof WorkspaceSchema>;
export function readWorkspace(
  storage: Pick<Storage, "getItem">,
): Workspace | undefined {
  try {
    const text = storage.getItem(WORKSPACE_KEY);
    if (!text || text.length > 12_000_000) return;
    const parsed = WorkspaceSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return;
  }
}

export function readBrowserWorkspace(): Workspace | undefined {
  try {
    return readWorkspace(localStorage);
  } catch {
    return;
  }
}
export function readBrowserDrafts(): Workspace[] {
  try {
    const text = localStorage.getItem(DRAFTS_KEY);
    if (!text || text.length > 12_000_000) return [];
    const drafts = z.array(WorkspaceSchema).max(20).safeParse(JSON.parse(text));
    return drafts.success ? drafts.data : [];
  } catch {
    return [];
  }
}
export function isDraft(w: Workspace): boolean {
  return !w.packet || w.packet.payload.response.action === "pending";
}
