import { test } from "node:test";
import assert from "node:assert/strict";
import { inspectContactCsv, parseMappedContactCsv } from "../src/lib/csv";
test("column aliases and reordered data import with quoted commas and newlines preserved", () => {
  const source =
    'Organization,Email address,Full name,Opt in\r\n"North,\nStudio",lead@example.com,Sample Lead,TRUE';
  const inspected = inspectContactCsv(source);
  assert.equal(inspected.mapping.name, "2");
  assert.equal(inspected.mapping.email, "1");
  const parsed = parseMappedContactCsv(source, inspected.mapping);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.contacts[0].company, "North,\nStudio");
  assert.equal(parsed.contacts[0].name, "Sample Lead");
  assert.equal(parsed.contacts[0].consent, true);
});
test("CSV mapping requires distinct, valid name and email columns", () => {
  const source = "Person,Address\nSam,sam@example.com";
  const mapping = { name: "", email: "", phone: "", company: "", consent: "" };
  assert.throws(
    () => parseMappedContactCsv(source, mapping),
    /Map name and email/,
  );
  assert.throws(
    () => parseMappedContactCsv(source, { ...mapping, name: "0", email: "0" }),
    /only one/,
  );
  assert.throws(
    () => parseMappedContactCsv(source, { ...mapping, name: "0", email: "9" }),
    /valid CSV columns/,
  );
});
test("mapped consent remains explicit and duplicate checking uses existing contacts", () => {
  const source =
    "Person,Address,Permission\nSam,sam@example.com,yes\nPat,pat@example.com,true";
  const mapping = {
    name: "0",
    email: "1",
    consent: "2",
    phone: "",
    company: "",
  };
  const first = parseMappedContactCsv(source, mapping);
  assert.equal(first.contacts[0].consent, false);
  assert.equal(first.contacts[1].consent, true);
  const repeated = parseMappedContactCsv(source, mapping, first.contacts);
  assert.equal(repeated.duplicates, 2);
  assert.equal(repeated.contacts.length, 0);
});
test("CSV inspection rejects empty input and excessive source columns", () => {
  assert.throws(() => inspectContactCsv("Person,Address"), /at least one/);
  assert.throws(
    () =>
      inspectContactCsv(
        Array.from({ length: 101 }, (_, i) => `column${i}`).join(",") +
          "\nvalue",
      ),
    /100 CSV columns/,
  );
});
