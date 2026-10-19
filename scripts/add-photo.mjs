// Adds a real photo for a catalogue item: crops it to a centred square,
// resizes to 800 px and saves public/veg/<slug>.webp.
// Then run `npm run catalogue` so seed.sql points at the photo.
//
// Usage: npm run photo -- <slug> <image file> ["credit / source"]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { catalogue } from "./catalogue.mjs";

const [slug, file, credit = "Provided by project owner"] = process.argv.slice(2);
if (!slug || !file) {
  console.error("Usage: npm run photo -- <slug> <image file> [credit]");
  process.exit(1);
}
if (!catalogue.some(([s]) => s === slug)) {
  console.error(`Unknown slug "${slug}". See scripts/catalogue.mjs.`);
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
await sharp(file)
  .rotate()
  .resize(800, 800, { fit: "cover", position: "centre" })
  .webp({ quality: 78 })
  .toFile(`${root}public/veg/${slug}.webp`);

// Keep a record of where every photo came from (needed before launch).
const creditsPath = `${root}public/veg/credits.json`;
let credits = {};
try {
  credits = JSON.parse(readFileSync(creditsPath, "utf8"));
} catch {}
credits[slug] = credit;
writeFileSync(creditsPath, JSON.stringify(credits, Object.keys(credits).sort(), 2) + "\n");
console.log(`Saved public/veg/${slug}.webp`);
