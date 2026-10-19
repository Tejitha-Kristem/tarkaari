// Renders the app icon SVG to the PNG sizes the manifest and iOS need.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));

// Simple white basket-and-leaf mark on tomato red. `pad` shrinks the art into
// the maskable safe zone (inner 80%) so Android's circle crop never clips it.
const art = (pad) => {
  const s = 1 - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#d63a20"/>
  <g transform="translate(${512 * pad} ${512 * pad}) scale(${s})" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round">
    <path d="M256 214c0-58 30-96 92-104-4 62-36 98-92 104z" fill="#fff" stroke-width="0"/>
    <path d="M256 214c-10-34-34-56-74-62" stroke-width="22"/>
    <path d="M108 236h296" stroke-width="30"/>
    <path d="M132 236l30 150a24 24 0 0 0 24 20h140a24 24 0 0 0 24-20l30-150" stroke-width="30"/>
    <path d="M216 290v64M296 290v64" stroke-width="22"/>
  </g>
</svg>`;
};

mkdirSync(`${root}public/icons`, { recursive: true });
const out = [
  [art(0), 192, "public/icons/icon-192.png"],
  [art(0), 512, "public/icons/icon-512.png"],
  [art(0.1), 512, "public/icons/maskable-512.png"],
  [art(0.06), 180, "src/app/apple-icon.png"],
  [art(0), 48, "src/app/icon.png"],
];
for (const [svg, size, file] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`${root}${file}`);
}
writeFileSync(`${root}public/icons/icon.svg`, art(0));
console.log(`Wrote ${out.length} icons.`);
