import { useEffect, useRef } from "react";
import type { PlumeRecord } from "../../../packages/core/index.ts";
import type { BatchRow } from "./explorer-types.ts";
export default function useSnapshot() {
  const worker = useRef<Worker | undefined>(undefined);
  const counter = useRef(0);
  const pending = useRef(
    new Map<
      number,
      {
        resolve: (v: { records?: PlumeRecord[]; results?: BatchRow[] }) => void;
        reject: (e: Error) => void;
      }
    >(),
  );
  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = undefined;
      for (const p of pending.current.values())
        p.reject(new Error("Snapshot request cancelled."));
      pending.current.clear();
    },
    [],
  );
  function request(data: {
    sourceId?: string;
    batch?: boolean;
    start?: string;
    end?: string;
  }) {
    if (!worker.current) {
      worker.current = new Worker(
        new URL("./data.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current.onmessage = (event: MessageEvent) => {
        const { id, error, ...value } = event.data;
        const p = pending.current.get(id);
        if (!p) return;
        pending.current.delete(id);
        if (error) p.reject(new Error(error));
        else p.resolve(value);
      };
      worker.current.onerror = () => {
        for (const p of pending.current.values())
          p.reject(
            new Error(
              "The snapshot worker could not start. Reload to try again.",
            ),
          );
        pending.current.clear();
        worker.current?.terminate();
        worker.current = undefined;
      };
    }
    const id = ++counter.current;
    return new Promise<{ records?: PlumeRecord[]; results?: BatchRow[] }>(
      (resolve, reject) => {
        pending.current.set(id, { resolve, reject });
        worker.current!.postMessage({ id, ...data });
      },
    );
  }
  return {
    sourceRecords: async (sourceId: string) =>
      (await request({ sourceId })).records!,
    batch: async (start: string, end: string) =>
      (await request({ batch: true, start, end })).results!,
  };
}
