import { ArrowUpRight } from "lucide-react";
import { MODEL } from "../../../packages/core/index.ts";
import type { SnapshotManifest } from "../../../packages/core/index.ts";
export default function MethodView({
  manifest,
}: {
  manifest: SnapshotManifest;
}) {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">A SMALL CLAIM. VISIBLE LIMITS.</p>
          <h1>What this review establishes.</h1>
          <p className="intro">
            Evidence, inference and acknowledgement have different meanings.
          </p>
        </div>
      </section>
      <div className="method-grid">
        <section className="panel">
          <h2>The evidence policy</h2>
          <ol>
            <li>Match the exact provider source ID.</li>
            <li>
              Select every detection within the start-inclusive, end-exclusive
              provider calendar dates.
            </li>
            <li>Keep all sensors and records with missing rates.</li>
            <li>Apply fixed, versioned rules for the confirmed claim type.</li>
            <li>
              Preserve the human response without deleting the original claim.
            </li>
          </ol>
          <h3>What remains unassessed</h3>
          <p>
            Physical repair, facility ownership, sustained cessation, regulatory
            compliance and a percentage emissions reduction. A later plume
            requires follow-up; it does not prove a repair did not happen.
          </p>
        </section>
        <section className="panel">
          <h2>Public source and attribution</h2>
          <p>
            UNEP IMEO MARS. Pinned download captured on 12 October 2026:{" "}
            {manifest.recordCount.toLocaleString("en-US")} plume rows and{" "}
            {manifest.sourceCount.toLocaleString("en-US")} sources.
          </p>
          <p>
            This is detection-only data. No complete negative-observation or
            overpass denominator is available. Some records have no source
            assignment or quantified rate.
          </p>
          <a
            href="https://methanedata.unep.org/download-dataset"
            target="_blank"
            rel="noreferrer"
          >
            Provider download <ArrowUpRight size={13} />
          </a>
          <h3>Data license notices differ</h3>
          <p>
            The download dictionary states CC BY-NC-SA 4.0; general terms state
            CC BY-NC 4.0. This noncommercial prototype preserves attribution and
            share-alike terms for adapted fixtures. Code is MIT; model is
            Apache-2.0.
          </p>
          <a
            href="https://methanedata.unep.org/dict-mars-plumes"
            target="_blank"
            rel="noreferrer"
          >
            Dictionary
          </a>{" "}
          ·{" "}
          <a
            href="https://methanedata.unep.org/terms-of-use"
            target="_blank"
            rel="noreferrer"
          >
            Provider terms
          </a>
        </section>
        <section className="panel">
          <h2>Local AI, bounded responsibility</h2>
          <p>
            {MODEL.id} computes sentence embeddings in a browser worker. Hybrid
            semantic and keyword ranking retrieves authored, cited guidance. You
            confirm the claim type.
          </p>
          <p>
            Inference stays on your device. The initial model download needs a
            connection; cached files may work offline. Errors fall back to
            keyword retrieval. The fixed evidence finding does not depend on the
            model.
          </p>
          <h3>Packet protocol</h3>
          <p>
            Strict JSON schema, RFC 8785 canonicalization and SHA-256. The
            digest excludes the receipt to avoid a circular hash. Duplicate keys
            and non-finite numbers are rejected.
          </p>
        </section>
        <section className="panel">
          <h2>Blockchain scope</h2>
          <p>
            The registry records owner-submitted digests, sequential revisions,
            explicit reviewer authorization, acknowledgement and terminal
            withdrawal. Reviewers are addresses, not certified auditors.
          </p>
          <p>
            A prior revision’s acknowledgement remains historical when a new
            revision is published. A local development chain is resettable; it
            is never shown as a durable public anchor.
          </p>
          <h3>No scientific signature</h3>
          <p>
            The provider ZIP is downloaded over HTTPS and pinned by hash. UNEP
            has not cryptographically signed this packet. A ledger commitment
            does not establish the truth of a claim or the honesty of a
            reviewer.
          </p>
        </section>
      </div>
    </>
  );
}
