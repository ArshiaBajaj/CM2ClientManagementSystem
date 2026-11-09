/**
 * Reading a client spreadsheet (CSV) exported from Healthie or any other system.
 * Column names vary between systems, so each field matches several common header spellings.
 */

/** Minimal CSV parser: commas, quoted fields, doubled quotes, and CRLF line endings. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const clean = text.replace(/^﻿/, "");
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

const FIELDS = {
  firstName: ["firstname", "first", "clientfirstname", "legalfirstname", "givenname", "preferredfirstname"],
  lastName: ["lastname", "last", "clientlastname", "legallastname", "surname", "familyname"],
  fullName: ["name", "fullname", "clientname", "client", "patientname"],
  dob: ["dob", "dateofbirth", "birthdate", "birthday", "clientdob"],
  email: ["email", "emailaddress", "clientemail", "studentemail"],
  phone: ["phone", "phonenumber", "mobile", "mobilephone", "cell", "cellphone", "clientphone"],
  guardianName: ["parentname", "guardianname", "parent", "guardian", "parentguardianname", "emergencycontactname", "emergencycontact"],
  guardianEmail: ["parentemail", "guardianemail", "parentguardianemail", "emergencycontactemail"],
  guardianPhone: ["parentphone", "guardianphone", "parentguardianphone", "emergencycontactphone"],
  timezone: ["timezone", "time zone"],
} as const;

export type ImportRow = {
  line: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  timezone: string;
};

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

/** Accepts 2009-04-02, 04/02/2009, 4/2/09. Returns YYYY-MM-DD or "" if it can't tell. */
export function normalizeDate(value: string) {
  const v = value.trim();
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += year > 30 ? 1900 : 2000;
    return `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return "";
}

export function readClientRows(text: string): { rows: ImportRow[]; missing: string[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], missing: ["a header row and at least one client"] };
  const header = table[0].map(norm);
  const col = (names: readonly string[]) => header.findIndex((h) => names.map(norm).includes(h));
  const idx = Object.fromEntries(Object.entries(FIELDS).map(([k, names]) => [k, col(names)])) as Record<keyof typeof FIELDS, number>;

  const missing: string[] = [];
  if (idx.firstName < 0 && idx.fullName < 0) missing.push("a first name (or full name) column");

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const rows = table.slice(1).map((r, n) => {
    let firstName = get(r, idx.firstName);
    let lastName = get(r, idx.lastName);
    if (!firstName && idx.fullName >= 0) {
      const parts = get(r, idx.fullName).split(/\s+/);
      firstName = parts.shift() ?? "";
      lastName = lastName || parts.join(" ");
    }
    return {
      line: n + 2,
      firstName: firstName.slice(0, 80),
      lastName: lastName.slice(0, 80),
      dateOfBirth: normalizeDate(get(r, idx.dob)),
      email: get(r, idx.email).toLowerCase().slice(0, 200),
      phone: get(r, idx.phone).slice(0, 40),
      guardianName: get(r, idx.guardianName).slice(0, 120),
      guardianEmail: get(r, idx.guardianEmail).toLowerCase().slice(0, 200),
      guardianPhone: get(r, idx.guardianPhone).slice(0, 40),
      timezone: get(r, idx.timezone) || "America/New_York",
    };
  });
  return { rows, missing };
}

export function toCsv(rows: string[][]) {
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\r\n") + "\r\n";
}
