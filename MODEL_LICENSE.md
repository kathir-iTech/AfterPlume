# Local embedding model

Model: [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2), pinned revision `751bff37182d3f1213fa05d7196b954e230abad9`, Apache License 2.0.

The model converts text to 384-dimensional sentence embeddings. It ranks authored guidance and suggests a claim template. It is not a methane detector, a physical model or a fraud classifier. The evidence decision is computed by fixed rules without model output.

Model files are downloaded from the pinned revision by `npm run model:prepare`, and served from the application's own static asset directory. File hashes and sizes are written to `apps/web/public/models/manifest.json`. Query inference runs in the browser, using Transformers.js and ONNX Runtime WASM. No hosted inference API is called. The original model weights are not trained or changed by this project.

[Apache License 2.0 text](https://www.apache.org/licenses/LICENSE-2.0). Upstream model and associated software retain their notices. Model file size does not include the browser inference runtime; consult measured benchmark reports for total transfer sizes.
