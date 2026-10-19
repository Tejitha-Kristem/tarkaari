import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePriceList, parseShoppingList, type Matchable } from "./list-parser.ts";

const items: Matchable[] = [
  { id: "tomato", unit: "kg", step: 0.25, names: ["Tomato", "ಟೊಮೇಟೊ", "tomatoes", "tamatar"] },
  { id: "onion", unit: "kg", step: 0.5, names: ["Onion", "ಈರುಳ್ಳಿ", "eerulli", "pyaz"] },
  { id: "spring-onion", unit: "bunch", step: 1, names: ["Spring onion", "ಈರುಳ್ಳಿ ಸೊಪ್ಪು", "eerulli soppu"] },
  { id: "coriander", unit: "bunch", step: 1, names: ["Coriander leaves", "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", "kothambari", "dhaniya"] },
  { id: "beans", unit: "kg", step: 0.25, names: ["Beans", "ಹುರುಳಿಕಾಯಿ", "huralikai"] },
  { id: "ginger", unit: "g", step: 100, names: ["Ginger", "ಶುಂಠಿ", "adrak"] },
  { id: "peas", unit: "kg", step: 0.25, names: ["Green peas", "peas", "matar"] },
];
const byId = (lines: ReturnType<typeof parseShoppingList>) =>
  Object.fromEntries(lines.filter((l) => l.item).map((l) => [l.item!.id, (l as { qty: number }).qty]));

test("WhatsApp-style English list", () => {
  const lines = parseShoppingList("tomato 1 kg, eerulli 2 kg, kothambari 2 kattu, half kg beans, xyz 2", items);
  assert.deepEqual(byId(lines), { tomato: 1, onion: 2, coriander: 2, beans: 0.5 });
  assert.equal(lines.filter((l) => !l.item).map((l) => l.text).join(), "xyz 2");
});

test("Kannada script, Kannada digits and 'ಅರ್ಧ'", () => {
  const lines = parseShoppingList("ಟೊಮೇಟೊ ೨ ಕೆಜಿ\nಅರ್ಧ ಕೆಜಿ ಈರುಳ್ಳಿ\nಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು 1", items);
  assert.deepEqual(byId(lines), { tomato: 2, onion: 0.5, coriander: 1 });
});

test("longest name wins: spring onion is not onion", () => {
  assert.deepEqual(byId(parseShoppingList("eerulli soppu 2", items)), { "spring-onion": 2 });
});

test("grams convert to kg and kg to grams", () => {
  assert.deepEqual(byId(parseShoppingList("250 g tomato, ginger 1 kg, adrak 200g", items)), { tomato: 0.25, ginger: 200 });
});

test("words and Hindi names", () => {
  assert.deepEqual(byId(parseShoppingList("two kg pyaz and dhaniya ek", items)), { onion: 2, coriander: 1 });
});

test("no quantity means one unit (100 g for gram items)", () => {
  assert.deepEqual(byId(parseShoppingList("beans, ginger", items)), { beans: 1, ginger: 100 });
});

test("short names don't match inside other words", () => {
  assert.deepEqual(byId(parseShoppingList("peas 1, peashooter", items)), { peas: 1 });
});

test("vendor price list with ranges", () => {
  const lines = parsePriceList("tomato 30-40, eerulli 35 to 45, ginger 12, abc 10-20", items);
  const got = Object.fromEntries(lines.filter((l) => l.item).map((l) => [l.item!.id, [(l as { min: number }).min, (l as { max: number }).max]]));
  assert.deepEqual(got, { tomato: [30, 40], onion: [35, 45], ginger: [12, 12] });
  assert.equal(lines.filter((l) => !l.item).length, 1);
});

test("vendor price list finds every item by its common name", async () => {
  const { catalogue } = await import("../../scripts/catalogue.mjs");
  const all: Matchable[] = (catalogue as [string, string, string, Matchable["unit"], string, string[]][]).map(([slug, en, kn, unit, , aliases]) => ({
    id: slug,
    unit,
    step: 1,
    names: [en, kn, ...aliases],
  }));
  const lines = parsePriceList("tomato 30-40, onion 35-45, palak 15-20, coriander 10-15, potato 30-35, methi 10-12", all);
  assert.deepEqual(
    lines.map((l) => l.item?.id ?? null),
    ["tomato", "onion", "spinach", "coriander", "potato", "methi"],
  );
});
