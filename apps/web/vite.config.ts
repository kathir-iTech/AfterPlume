import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  optimizeDeps:{include:['@huggingface/transformers']},
  build: { outDir: "dist", target: "es2022" },
  worker: { format: "es" },
  server: { port: 5173 },
  preview: { port: 4173 },
});
