import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { parseContactCsv, parseCsv } from "../src/lib/csv";
import { verifyHmac } from "../src/lib/signatures";
import { canSendAt, outreachAllowed } from "../src/lib/scheduling";
import { reserve, settle, type WalletState } from "../src/lib/wallet-model";
test("CSV handles quoted commas, escaped quotes and newlines", () => {
  assert.deepEqual(
    parseCsv('name,email\r\n"A, B","a@example.com"\r\n"C ""D""",c@example.com'),
    [
      ["name", "email"],
      ["A, B", "a@example.com"],
      ['C "D"', "c@example.com"],
    ],
  );
  assert.throws(() => parseCsv('"unfinished'));
});
test("CSV validates rows, deduplicates and requires explicit consent", () => {
  const r = parseContactCsv(
    "name,email,phone,consent\nA,a@example.com,+919876543210,true\nB,a@example.com,,false\nC,c@example.com,,\nD,invalid,,",
  );
  assert.equal(r.contacts.length, 2);
  assert.equal(r.duplicates, 1);
  assert.equal(r.errors.length, 1);
  assert.equal(r.contacts[1].consent, false);
});
test("webhook signatures reject missing, malformed and changed payloads", () => {
  const signature = createHmac("sha256", "secret").update("body").digest("hex");
  assert.equal(verifyHmac("body", signature, "secret"), true);
  assert.equal(verifyHmac("tampered", signature, "secret"), false);
  assert.equal(verifyHmac("body", "zz", "secret"), false);
  assert.equal(verifyHmac("body", signature, undefined), false);
});
test("sending windows respect timezone, exclusive end, disabled days, DST", () => {
  const windows = [{ weekday: 1, start: "09:00", end: "18:00", enabled: true }];
  assert.equal(
    canSendAt(new Date("2026-10-26T03:30:00Z"), "Asia/Kolkata", windows),
    true,
  );
  assert.equal(
    canSendAt(new Date("2026-10-26T12:30:00Z"), "Asia/Kolkata", windows),
    false,
  );
  assert.equal(
    canSendAt(new Date("2026-10-25T05:00:00Z"), "Asia/Kolkata", windows),
    false,
  );
  assert.equal(
    canSendAt(new Date("2026-03-09T13:00:00Z"), "America/New_York", windows),
    true,
  );
  assert.equal(canSendAt(new Date(), "Asia/Kolkata", []), false);
});
test("reply, handoff and opt-out suppress outreach", () => {
  for (const status of ["replied", "handoff", "opted_out", "cancelled"])
    assert.equal(
      outreachAllowed({
        consent: true,
        optedOut: false,
        enrollmentStatus: status,
      }),
      false,
    );
  assert.equal(
    outreachAllowed({
      consent: false,
      optedOut: false,
      enrollmentStatus: "active",
    }),
    false,
  );
  assert.equal(
    outreachAllowed({
      consent: true,
      optedOut: true,
      enrollmentStatus: "active",
    }),
    false,
  );
});
test("wallet reservations prevent overspend and settle actual costs once", () => {
  const w: WalletState = { balance: 100n, reserved: 0n, requests: new Map() };
  reserve(w, "a", 70n);
  reserve(w, "a", 70n);
  assert.equal(w.reserved, 70n);
  assert.throws(() => reserve(w, "b", 40n), /insufficient/);
  settle(w, "a", 50n);
  settle(w, "a", 50n);
  assert.equal(w.balance, 50n);
  assert.equal(w.reserved, 0n);
  assert.throws(() => settle(w, "a", 40n), /conflict/);
  reserve(w, "b", 40n);
  settle(w, "b", 0n);
  assert.equal(w.balance, 50n);
  assert.equal(w.reserved, 0n);
});
