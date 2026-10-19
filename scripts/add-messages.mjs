// Adds message keys to both languages: node scripts/add-messages.mjs file.json
// where file.json is { "ns.key": ["English", "ಕನ್ನಡ"], ... }. Existing keys are overwritten.
import { readFileSync, writeFileSync } from "node:fs";

const adds = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const [i, lang] of ["en", "kn"].entries()) {
  const file = new URL(`../messages/${lang}.json`, import.meta.url);
  const messages = JSON.parse(readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(adds)) {
    const parts = key.split(".");
    let node = messages;
    for (const p of parts.slice(0, -1)) node = node[p] ??= {};
    node[parts.at(-1)] = values[i];
  }
  writeFileSync(file, JSON.stringify(messages, null, 2) + "\n");
}
console.log(`Added ${Object.keys(adds).length} keys.`);
