import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PROGRAM_MANAGER_EMAILS, ensureProgramManagers } from "@/lib/managers";

/**
 * Program setup that "Start fresh" keeps: form and agreement templates, session types, settings, and the audit log.
 * Everything else (students, families, sessions, notes, messages, coaches, interns, teams, preview accounts)
 * is deleted.
 */
const KEEP = new Set([
  "ProgramSettings",
  "FormTemplate",
  "FormReleaseRule",
  "AppointmentType",
  "DocumentTemplate",
  "AccessPacket",
  "AuditEvent",
]);

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Tables in an order that's safe to delete from: anything holding a reference goes before what it points to.
 * Read from the database's own foreign keys, so it always matches the live tables.
 */
async function deleteOrder(tx: Tx) {
  const names = Prisma.dmmf.datamodel.models.map((m) => m.name).filter((n) => !KEEP.has(n));
  const links = await tx.$queryRawUnsafe<{ child: string; parent: string }[]>(
    `SELECT c.conrelid::regclass::text AS child, c.confrelid::regclass::text AS parent
       FROM pg_constraint c
       JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f' AND n.nspname = current_schema()`,
  );
  const clean = (t: string) => t.replace(/^.*\./, "").replace(/"/g, "");
  const pointsTo = new Map(names.map((n) => [n, new Set<string>()]));
  for (const { child, parent } of links) {
    const from = clean(child);
    const to = clean(parent);
    if (from !== to && pointsTo.has(from)) {
      if (KEEP.has(to)) continue;
      pointsTo.get(from)!.add(to);
    }
  }
  const order: string[] = [];
  const done = new Set<string>();
  while (order.length < names.length) {
    const next = names.find(
      (n) => !done.has(n) && names.every((o) => done.has(o) || o === n || !pointsTo.get(o)!.has(n)),
    );
    if (!next) throw new Error("Couldn't work out a safe delete order");
    order.push(next);
    done.add(next);
  }
  return order;
}

export async function startFresh(keepUserId: string) {
  const keepEmails = [...PROGRAM_MANAGER_EMAILS];
  let tables = 0;
  await prisma.$transaction(
    async (tx) => {
      // Kept accounts stop pointing at the records about to go.
      await tx.user.updateMany({
        where: { OR: [{ id: keepUserId }, { email: { in: keepEmails } }] },
        data: { internId: null, clientId: null, coachId: null },
      });
      const order = await deleteOrder(tx);
      tables = order.length;
      for (const table of order) {
        if (table === "User") {
          await tx.$executeRawUnsafe(
            `DELETE FROM "User" WHERE "id" <> $1 AND NOT ("email" = ANY($2::text[]))`,
            keepUserId,
            keepEmails,
          );
        } else {
          await tx.$executeRawUnsafe(`DELETE FROM "${table}"`);
        }
      }
    },
    { timeout: 60_000 },
  );
  await ensureProgramManagers();
  return tables;
}
