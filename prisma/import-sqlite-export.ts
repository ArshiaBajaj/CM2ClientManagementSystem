/**
 * One-off: loads prisma/export/<Model>.json (dumped from the old SQLite dev.db with
 * `sqlite3 -json`) into the Postgres database in DATABASE_URL. Skips rows that already exist.
 *
 *   npx tsx prisma/import-sqlite-export.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dir = path.join(__dirname, "export");

function convert(value: unknown, type: string) {
  if (value === null || value === undefined) return value;
  if (type === "DateTime") return new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : (value as number | string));
  if (type === "Boolean") return value === 1 || value === "1" || value === true;
  if (type === "Int") return Number(value);
  if (type === "Float") return Number(value);
  return value;
}

async function main() {
  // Schema order already lists parents before children.
  for (const model of Prisma.dmmf.datamodel.models) {
    const file = path.join(dir, `${model.name}.json`);
    const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
    const rows: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
    if (rows.length === 0) continue;

    const scalars = model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
    const data = rows.map((row) =>
      Object.fromEntries(scalars.filter((f) => f.name in row).map((f) => [f.name, convert(row[f.name], f.type)])),
    );
    const delegate = (prisma as unknown as Record<string, { createMany: (args: unknown) => Promise<{ count: number }> }>)[
      model.name.charAt(0).toLowerCase() + model.name.slice(1)
    ];
    const { count } = await delegate.createMany({ data, skipDuplicates: true });
    console.log(`${model.name}: ${count}/${rows.length}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
