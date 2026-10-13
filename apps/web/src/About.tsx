import { ArrowUpRight } from "lucide-react";
export default function About() {
  return (
    <section className="about-view">
      <p className="eyebrow">WHY AFTERPLUME</p>
      <h1>
        Check before
        <br />
        <em>you cite.</em>
      </h1>
      <p className="about-lead">
        A climate reporter receives a methane statement. The observations are
        public, but checking them means searching a large satellite dataset—and
        trusting that the report included every relevant record.
      </p>
      <p>
        AfterPlume keeps the original statement, checks the matching
        observations and exports a review someone else can repeat. Its proof
        demonstration shows why an edited file can pass its own hash while
        leaving out evidence.
      </p>
      <details className="disclosure">
        <summary>AI, evidence and the registry</summary>
        <p>
          Local sentence embeddings suggest claim types and rank reference
          notes. A human confirms the type; fixed rules determine the evidence
          result. The optional Solidity registry preserves exact revisions and
          reviewer acknowledgements. Its recorded demonstration runs on a local,
          resettable EVM; no public deployment is configured.
        </p>
      </details>
      <details className="disclosure">
        <summary>What has been measured</summary>
        <p>
          62 unit tests, 19 contract tests and end-to-end browser checks cover
          the prototype. The authored guidance holdout ranked the expected note
          first in 16 of 18 hybrid queries. These are engineering checks, not
          evidence of user adoption or emissions reduction.
        </p>
        <a
          href="https://github.com/kathir-iTech/AfterPlume/blob/main/docs/VALIDATION.md"
          target="_blank"
          rel="noreferrer"
        >
          Reproduce the measurements <ArrowUpRight size={14} />
        </a>
      </details>
      <details className="disclosure">
        <summary>Hackathon and track</summary>
        <p>
          Built for the IEEE ClimateChain Global Hackathon, under Climate Data
          &amp; Environmental Monitoring: making fragmented environmental
          evidence easier to check and share.
        </p>
        <a
          href="https://ieee-climatechain-hack.devpost.com/"
          target="_blank"
          rel="noreferrer"
        >
          Event and judging criteria <ArrowUpRight size={14} />
        </a>
      </details>
    </section>
  );
}
