import type { Contact } from "./demo";
// RFC4180-style parsing: quoted commas/newlines and escaped quotes.
export function parseCsv(text: string): string[][] {
  if (text.length > 2_000_000) throw new Error("CSV exceeds 2 MB");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseContactCsv(text: string, existing: Contact[] = []) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length > 1001) throw new Error("Maximum 1,000 contacts per import");
  const headers = rows.shift()?.map((s) => s.trim().toLowerCase()) || [];
  const idx = (n: string) => headers.indexOf(n);
  if (idx("name") < 0 || idx("email") < 0)
    throw new Error("CSV requires name and email columns");
  const errors: string[] = [],
    contacts: Contact[] = [];
  let duplicates = 0;
  const emails = new Set(existing.map((c) => c.email.toLowerCase())),
    phones = new Set(existing.map((c) => c.phone).filter(Boolean));
  rows.forEach((r, i) => {
    const get = (k: string) => (r[idx(k)] || "").trim();
    const name = get("name"),
      email = get("email").toLowerCase(),
      phone = get("phone");
    if (
      !name ||
      name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      (phone && !/^\+[1-9]\d{7,14}$/.test(phone))
    ) {
      errors.push(`Row ${i + 2}: invalid name, email, or international phone`);
      return;
    }
    if (emails.has(email) || (phone && phones.has(phone))) {
      duplicates++;
      return;
    }
    emails.add(email);
    if (phone) phones.add(phone);
    contacts.push({
      id: crypto.randomUUID(),
      name,
      company: get("company"),
      email,
      phone,
      stage: "New",
      tags: [],
      consent: get("consent").toLowerCase() === "true",
    });
  });
  return { contacts, errors, duplicates };
}
