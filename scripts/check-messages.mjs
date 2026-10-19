// Fails if English and Kannada message files don't have exactly the same keys,
// or if a Kannada string is empty.
import { readFileSync } from "node:fs";

const load = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url)));
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) => (typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));

const en = new Map(flatten(load("en")));
const kn = new Map(flatten(load("kn")));
const problems = [
  ...[...en.keys()].filter((k) => !kn.has(k)).map((k) => `missing in kn.json: ${k}`),
  ...[...kn.keys()].filter((k) => !en.has(k)).map((k) => `not in en.json: ${k}`),
  ...[...kn].filter(([, v]) => !String(v).trim()).map(([k]) => `empty in kn.json: ${k}`),
];
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Messages OK: ${en.size} keys in both languages.`);
