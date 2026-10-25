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

export const contactImportFields = [
  "name",
  "email",
  "phone",
  "company",
  "consent",
] as const;
export type ContactColumnMapping = Record<
  (typeof contactImportFields)[number],
  string
>;
export function inspectContactCsv(text: string) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift();
  if (!headers?.length || !rows.length)
    throw Error("CSV needs a header row and at least one contact.");
  if (rows.length > 1000) throw Error("Maximum 1,000 contacts per import");
  if (headers.length > 100) throw Error("Maximum 100 CSV columns");
  const mapping: ContactColumnMapping = {
    name: "",
    email: "",
    phone: "",
    company: "",
    consent: "",
  };
  const aliases: Record<(typeof contactImportFields)[number], string[]> = {
    name: ["name", "full name", "contact name"],
    email: ["email", "email address", "e-mail"],
    phone: ["phone", "phone number", "mobile", "mobile number"],
    company: ["company", "company name", "organization"],
    consent: ["consent", "opt in", "opt-in"],
  };
  for (const field of contactImportFields) {
    const index = headers.findIndex((h) =>
      aliases[field].includes(h.trim().toLowerCase()),
    );
    if (index >= 0) mapping[field] = String(index);
  }
  return { headers, rows, sample: rows.slice(0, 3), mapping };
}
export function parseMappedContactCsv(
  text: string,
  mapping: ContactColumnMapping,
  existing: Contact[] = [],
) {
  const { headers, rows } = inspectContactCsv(text);
  if (mapping.name === "" || mapping.email === "")
    throw Error("Map name and email columns before reviewing.");
  const used = Object.values(mapping).filter((v) => v !== "");
  if (new Set(used).size !== used.length)
    throw Error("Map each CSV column to only one contact field.");
  if (used.some((v) => !/^\d+$/.test(v) || Number(v) >= headers.length))
    throw Error("Choose valid CSV columns.");
  const encode = (value: string) => '"' + value.replaceAll('"', '""') + '"';
  const normalized = [
    contactImportFields.map(encode).join(","),
    ...rows.map((row) =>
      contactImportFields
        .map((field) =>
          encode(
            mapping[field] === "" ? "" : row[Number(mapping[field])] || "",
          ),
        )
        .join(","),
    ),
  ].join("\r\n");
  return parseContactCsv(normalized, existing);
}
