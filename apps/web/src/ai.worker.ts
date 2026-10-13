import { env, pipeline } from "@huggingface/transformers";
import {
  cards,
  templates,
  cosine,
  hybridRank,
} from "../../../packages/retrieval/index.ts";
import { MODEL } from "../../../packages/core/index.ts";
import wasmUrl from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url";
import wasmModuleUrl from "../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs?url";
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";
// Avoid an HTTP disk-cache failure on large streamed model responses. The
// library's explicit CacheStorage cache remains available; queries stay local.
env.fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.wasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl };
let extractor:
  | Awaited<ReturnType<typeof pipeline<"feature-extraction">>>
  | undefined;
let cardVectors: number[][] = [];
let templateVectors: number[][] = [];
self.onmessage = async (event: MessageEvent<{ id: number; query: string }>) => {
  const { id, query } = event.data;
  try {
    if (!extractor) {
      extractor = await pipeline("feature-extraction", MODEL.id, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (p) => self.postMessage({ id, progress: p }),
      });
      const cardOutput = await extractor(
        cards.map((c) => c.title + " " + c.text),
        { pooling: "mean", normalize: true },
      );
      cardVectors = cardOutput.tolist() as number[][];
      const templateOutput = await extractor(
        templates.map((t) => t.text),
        { pooling: "mean", normalize: true },
      );
      templateVectors = templateOutput.tolist() as number[][];
    }
    const started = performance.now();
    const result = await extractor(query, { pooling: "mean", normalize: true });
    const vector = (result.tolist() as number[][])[0];
    const ranked = hybridRank(query, vector, cardVectors);
    const suggestions = templates
      .map((t, i) => ({
        kind: t.kind,
        score: cosine(vector, templateVectors[i]),
      }))
      .sort((a, b) => b.score - a.score);
    self.postMessage({
      id,
      result: {
        engine: "semantic-local",
        guidanceIds: ranked.slice(0, 3).map((r) => r.id),
        suggestedKind: suggestions[0].kind,
        scores: suggestions,
        milliseconds: performance.now() - started,
        dimensions: vector.length,
        modelRevision: MODEL.revision,
      },
    });
  } catch (error) {
    self.postMessage({
      id,
      error:
        error instanceof Error ? error.message : "Local inference unavailable.",
    });
  }
};
