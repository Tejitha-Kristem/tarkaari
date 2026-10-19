// Reads a typed or spoken shopping list ("tomato 1 kg, eerulli 2 kg, half kg
// beans, kothambari 2 kattu") or a vendor price list ("tomato 30-40") and
// matches each line to a catalogue item using its English/Kannada names and
// aliases (spellings, Kannada in English letters, Hindi).

export type Matchable = {
  id: string;
  unit: "kg" | "g" | "piece" | "bunch" | "packet";
  step: number;
  names: string[];
};

export type ParsedLine<T extends Matchable> =
  | { text: string; item: T; qty: number; min?: number; max?: number }
  | { text: string; item: null };

const SPLIT = /[,\n;।]+|\s+(?:and|mattu|ಮತ್ತು|aur)\s+/i;
const KANNADA_DIGITS = "೦೧೨೩೪೫೬೭೮೯";
const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ondu: 1, eradu: 2, mooru: 3, nalku: 4, aidu: 5, ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
};
const HALF = /\b(half|ardha|aadha|adha)\b|ಅರ್ಧ/;
const QUARTER = /\b(quarter|kaal|pav|paav)\b|ಕಾಲು/;
const GRAMS = /\d\s*(g|gm|gms|gram|grams)\b|\b(g|gm|gms|gram|grams)\b|ಗ್ರಾಂ/;
const KILOS = /\b(kg|kgs|kilo|kilos|kilogram)\b|ಕೆಜಿ/;

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[೦-೯]/g, (d) => String(KANNADA_DIGITS.indexOf(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function buildIndex<T extends Matchable>(items: T[]) {
  const entries: { name: string; item: T }[] = [];
  for (const item of items) {
    for (const n of item.names) {
      const name = normalise(n);
      if (name.length >= 2) entries.push({ name, item });
    }
  }
  // Longest names first, so "spring onion" wins over "onion".
  return entries.sort((a, b) => b.name.length - a.name.length);
}

function findItem<T extends Matchable>(line: string, index: { name: string; item: T }[]): T | null {
  for (const { name, item } of index) {
    const ascii = /^[a-z0-9 .'-]+$/.test(name);
    const re = ascii ? new RegExp(`(^|[^a-z])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`) : null;
    if (re ? re.test(line) : line.includes(name)) return item;
  }
  return null;
}

function readQty<T extends Matchable>(line: string, item: T): number {
  let qty: number | null = null;
  const num = line.match(/(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+))?/);
  if (num) qty = num[2] ? Number(num[1]) / Number(num[2]) : Number(num[1]);
  if (qty === null) {
    for (const [word, n] of Object.entries(WORD_NUMBERS)) {
      if (new RegExp(`(^|\\s)${word}(\\s|$)`).test(line)) {
        qty = n;
        break;
      }
    }
  }
  if (HALF.test(line)) qty = (qty ?? 1) * 0.5;
  if (QUARTER.test(line)) qty = (qty ?? 1) * 0.25;
  if (qty === null) qty = item.unit === "g" ? 100 : item.unit === "kg" ? 1 : 1;
  if (item.unit === "kg" && GRAMS.test(line) && !KILOS.test(line)) qty = qty / 1000;
  if (item.unit === "g" && KILOS.test(line)) qty = qty * 1000;
  return Math.round(qty * 1000) / 1000;
}

/** Shopping list → items with quantities in each item's own unit. */
export function parseShoppingList<T extends Matchable>(text: string, items: T[]): ParsedLine<T>[] {
  const index = buildIndex(items);
  return text
    .split(SPLIT)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const line = normalise(raw);
      const item = findItem(line, index);
      if (!item) return { text: raw, item: null };
      const qty = readQty(line, item);
      return qty > 0 ? { text: raw, item, qty } : { text: raw, item: null };
    });
}

/** Vendor price list ("tomato 30-40", "palak 15 to 20") → price ranges. */
export function parsePriceList<T extends Matchable>(text: string, items: T[]): ParsedLine<T>[] {
  const index = buildIndex(items);
  return text
    .split(/[,\n;।]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const line = normalise(raw);
      const item = findItem(line, index);
      const range = line.match(/(\d+(?:\.\d+)?)\s*(?:-|–|to|ರಿಂದ|se)\s*(\d+(?:\.\d+)?)/);
      const single = line.match(/(\d+(?:\.\d+)?)/);
      if (!item || (!range && !single)) return { text: raw, item: null };
      const a = Number(range ? range[1] : single![1]);
      const b = Number(range ? range[2] : single![1]);
      return { text: raw, item, qty: 0, min: Math.min(a, b), max: Math.max(a, b) };
    });
}
