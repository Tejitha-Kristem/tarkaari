import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingState, canCustomerEdit, istNow, vendorAcceptDeadline } from "./time.ts";

// All instants are given in UTC; IST = UTC + 5:30.
const at = (iso: string) => new Date(iso);

test("IST date rolls over at 18:30 UTC", () => {
  assert.deepEqual(istNow(at("2026-10-18T18:29:00Z")), { date: "2026-10-18", minutes: 23 * 60 + 59 });
  assert.deepEqual(istNow(at("2026-10-18T18:30:00Z")), { date: "2026-10-19", minutes: 0 });
});

test("before 10:00 IST the window is not open yet", () => {
  const s = bookingState(at("2026-10-19T04:29:00Z")); // 09:59 IST
  assert.equal(s.phase, "not_open");
  assert.equal(s.deliveryDate, "2026-10-20");
  assert.equal(s.opensAt?.toISOString(), "2026-10-19T04:30:00.000Z");
});

test("10:00–16:59 IST is open for tomorrow", () => {
  for (const iso of ["2026-10-19T04:30:00Z", "2026-10-19T11:29:59Z"]) {
    const s = bookingState(at(iso));
    assert.equal(s.phase, "open", iso);
    assert.equal(s.deliveryDate, "2026-10-20");
    assert.equal(s.closesAt?.toISOString(), "2026-10-19T11:30:00.000Z");
  }
});

test("from 17:00 IST orders are locked until 10:00 next day", () => {
  const s = bookingState(at("2026-10-19T11:30:00Z")); // 17:00 IST
  assert.equal(s.phase, "locked");
  assert.equal(s.deliveryDate, "2026-10-20");
  assert.equal(s.opensAt?.toISOString(), "2026-10-20T04:30:00.000Z");
  // Late night, after the IST date has not yet rolled over.
  assert.equal(bookingState(at("2026-10-19T18:00:00Z")).phase, "locked");
});

test("customers edit only the order for the open window", () => {
  const noon = at("2026-10-19T06:30:00Z"); // 12:00 IST
  assert.equal(canCustomerEdit("2026-10-20", noon), true);
  assert.equal(canCustomerEdit("2026-10-21", noon), false);
  assert.equal(canCustomerEdit("2026-10-20", at("2026-10-19T12:00:00Z")), false);
});

test("vendor must accept by 21:00 IST the evening before", () => {
  assert.equal(vendorAcceptDeadline("2026-10-20").toISOString(), "2026-10-19T15:30:00.000Z");
});

test("shortDate takes plain dates and timestamps", async () => {
  const { shortDate } = await import("./format.ts");
  assert.equal(shortDate("2026-10-20", "en", { day: "numeric", month: "short" }), "20 Oct");
  assert.equal(shortDate("2026-10-19T20:00:00Z", "en", { day: "numeric", month: "short" }), "20 Oct");
});
