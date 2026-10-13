import type { Claim } from "../core/index.ts";
export const cards = [
  {
    id: "bounded",
    title: "A source and an interval",
    text: "No recorded detections is a bounded statement about one exact source ID and start inclusive end exclusive calendar dates. Review every source-assigned detection regardless of satellite or missing emission rate.",
    url: "https://methanedata.unep.org/dict-mars-plumes",
  },
  {
    id: "coverage",
    title: "No record is not zero emissions",
    text: "A detection-only snapshot does not report all satellite overpasses or negative observations. Clouds, observing conditions and sensitivity constrain detection. An empty interval cannot certify zero emissions or sustained cessation.",
    url: "https://www.unep.org/topics/energy/methane/methane-alert-and-response-system-mars",
  },
  {
    id: "repair",
    title: "Repair needs field evidence",
    text: "A repair occurred on a date is a statement about an operator action. Work orders, site inspection and follow-up measurement are needed to establish repair and mitigation. A later satellite detection requires follow-up; it does not prove a repair never happened.",
    url: "https://www.unep.org/topics/energy/methane/methane-alert-and-response-system-mars",
  },
  {
    id: "rates",
    title: "An instantaneous emission rate",
    text: "The methane flux rate is an instantaneous estimate in kilograms per hour. Reported standard deviation is uncertainty, not an independently validated confidence interval. Do not annualize a single satellite observation or certify a reduction percentage from isolated rates.",
    url: "https://methanedata.unep.org/dict-mars-plumes",
  },
  {
    id: "source",
    title: "Use the provider source assignment",
    text: "Match exactly the provider source_name identifier. Unassigned source rows cannot be attributed by proximity. Latitude and longitude provide context, not proof of facility ownership or responsibility.",
    url: "https://methanedata.unep.org/dict-mars-plumes",
  },
  {
    id: "time",
    title: "Keep the time basis visible",
    text: "Tile date is the acquisition timestamp in the public data. This app preserves the original string and evaluates its provider calendar date without a timezone conversion. A precise UTC assertion needs a documented timezone basis.",
    url: "https://methanedata.unep.org/dict-mars-plumes",
  },
  {
    id: "snapshot",
    title: "A versioned public snapshot",
    text: "A review is complete only within its identified downloaded dataset. Future updates may add records acquired earlier. Preserve the archive SHA-256 and reevaluate a new snapshot as a new review revision.",
    url: "https://methanedata.unep.org/download-dataset",
  },
  {
    id: "hash",
    title: "Hashing does not prove inclusion",
    text: "A canonical payload digest proves file consistency. An author can omit a conflicting row and recompute the hash. Replay against the full known source snapshot detects omissions in that snapshot. A ledger records the submitted digest; it does not certify scientific truth.",
    url: "https://www.rfc-editor.org/rfc/rfc8785",
  },
  {
    id: "response",
    title: "Respond without erasing evidence",
    text: "A person can narrow, correct, retain with an explanation or withdraw a statement. Keep the original claim and evidence visible. A completed review and a reviewer acknowledgement do not establish that emissions stopped.",
    url: "https://github.com/kathir-iTech/AfterPlume",
  },
  {
    id: "missing",
    title: "Missing quantification is still a detection",
    text: "A plume record with an empty methane rate or standard deviation remains a positive detection record. Missing numerical quantification must not be filtered out of a no recorded detections claim.",
    url: "https://methanedata.unep.org/dict-mars-plumes",
  },
] as const;
export const templates: { kind: Claim["kind"]; text: string }[] = [
  {
    kind: "no_detections",
    text: "No methane detections were recorded for this source during the stated interval.",
  },
  {
    kind: "repair_occurred",
    text: "The leak was repaired on this date. An operator repair action occurred.",
  },
  {
    kind: "zero_emissions",
    text: "Methane emissions stopped entirely. This site has verified zero emissions and sustained cessation.",
  },
  {
    kind: "reduction_percent",
    text: "Methane emissions decreased by a measured percentage compared with the baseline.",
  },
];
const words = (s: string): string[] =>
  s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
export function suggestLexicalKind(query: string): Claim['kind'] {
  const q = query.toLowerCase();
  if (/percent|percentage|\d\s*%|reduc|decreas|baseline/.test(q)) return 'reduction_percent';
  if (/repair|fix|work order/.test(q)) return 'repair_occurred';
  if (/zero emission|ceased|cessation|stopped|no emission|emission.free/.test(q)) return 'zero_emissions';
  return 'no_detections';
}
export function lexicalRank(query: string): { id: string; score: number }[] {
  const docs = cards.map((c) => words(c.title + " " + c.text));
  const q = [...new Set(words(query))];
  const average = docs.reduce((s, d) => s + d.length, 0) / docs.length;
  return docs
    .map((tokens, i) => {
      let score = 0;
      for (const word of q) {
        const frequency = tokens.filter((t) => t === word).length;
        const df = docs.filter((d) => d.includes(word)).length;
        const idf = Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
        score +=
          (idf * frequency * 2.2) /
          (frequency + 1.2 * (0.25 + (0.75 * tokens.length) / average));
      }
      return { id: cards[i].id, score };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
export function cosine(a: number[], b: number[]): number {
  return (
    a.reduce((s, x, i) => s + x * b[i], 0) /
    (Math.sqrt(a.reduce((s, x) => s + x * x, 0)) *
      Math.sqrt(b.reduce((s, x) => s + x * x, 0)) || 1)
  );
}
export function hybridRank(
  query: string,
  vector: number[],
  cardVectors: number[][],
): { id: string; score: number }[] {
  const semantic = cards
    .map((c, i) => ({ id: c.id, score: cosine(vector, cardVectors[i]) }))
    .sort((a, b) => b.score - a.score);
  const lexical = lexicalRank(query);
  return cards
    .map((c) => ({
      id: c.id,
      score:
        1 / (60 + semantic.findIndex((s) => s.id === c.id)) +
        1 / (60 + lexical.findIndex((s) => s.id === c.id)),
    }))
    .sort((a, b) => b.score - a.score);
}
