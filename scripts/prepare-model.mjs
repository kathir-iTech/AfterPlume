import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL(
  "../apps/web/public/models/Xenova/all-MiniLM-L6-v2/",
  import.meta.url,
);
const revision = "751bff37182d3f1213fa05d7196b954e230abad9";
const files = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "onnx/model_quantized.onnx",
];
const expected = JSON.parse(
  await readFile(
    new URL("../public-data/model-manifest.json", import.meta.url),
    "utf8",
  ),
);
const manifest = [];
for (const name of files) {
  const path = new URL(name, root);
  await mkdir(new URL(".", path), { recursive: true });
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    const response = await fetch(
      `https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/${revision}/${name}`,
    );
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path, bytes);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const known = expected.files.find((f) => f.path === name);
  if (!known || known.bytes !== bytes.length || known.sha256 !== sha256)
    throw new Error(`Pinned model integrity mismatch: ${name}`);
  manifest.push({ path: name, bytes: bytes.length, sha256 });
  console.log(name, bytes.length);
}
await writeFile(
  new URL("../apps/web/public/models/manifest.json", import.meta.url),
  JSON.stringify(
    {
      model: "Xenova/all-MiniLM-L6-v2",
      revision,
      license: "Apache-2.0",
      files: manifest,
    },
    null,
    2,
  ),
);
console.log(
  "Model prepared locally. Runtime query inference is still required.",
);
await writeFile(new URL('../apps/web/public/models/LICENSE-APACHE-2.0.txt',import.meta.url),await readFile(new URL('../MODEL_APACHE_LICENSE.txt',import.meta.url)));
