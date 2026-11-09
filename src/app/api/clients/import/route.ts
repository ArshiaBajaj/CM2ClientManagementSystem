import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { nextClientPublicId } from "@/lib/ids";
import { audit, temporaryPassword } from "@/lib/security";
import { readClientRows, toCsv } from "@/lib/import-clients";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/clients/import?error=${encodeURIComponent(message)}`, request.url), 303);
}

/**
 * Creates many Coach Me 2 students (and their parents) from one spreadsheet, such as a Healthie client export.
 * Replies with a spreadsheet listing every row's result and each new login's temporary password.
 */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return back(request, "Choose the CSV file to upload");
  if (file.size > 2_000_000) return back(request, "That file is too large (2 MB max)");
  const studentLogins = form.get("studentLogins") === "1";
  const parentLogins = form.get("parentLogins") === "1";

  const { rows, missing } = readClientRows(await file.text());
  if (missing.length) return back(request, `The file needs ${missing.join(" and ")}`);
  if (rows.length > 500) return back(request, "Import up to 500 clients at a time");

  const report: string[][] = [["Line", "Student", "Result", "Login email", "Temporary password", "Parent login", "Parent temporary password"]];
  let created = 0;

  for (const row of rows) {
    const name = `${row.firstName} ${row.lastName}`.trim();
    if (!row.firstName || !row.lastName) {
      report.push([String(row.line), name, "Skipped: needs a first and last name", "", "", "", ""]);
      continue;
    }
    const duplicate = await prisma.client.findFirst({
      where: {
        OR: [
          ...(row.email ? [{ email: row.email }] : []),
          { firstName: row.firstName, lastName: row.lastName, ...(row.dateOfBirth ? { dateOfBirth: row.dateOfBirth } : {}) },
        ],
      },
    });
    if (duplicate) {
      report.push([String(row.line), name, `Skipped: already in the portal (${duplicate.publicId})`, "", "", "", ""]);
      continue;
    }

    // Siblings who share a parent join that parent's existing family.
    const knownParent = EMAIL.test(row.guardianEmail)
      ? await prisma.guardian.findFirst({ where: { email: row.guardianEmail } })
      : null;
    const household = knownParent
      ? { id: knownParent.householdId }
      : await prisma.household.create({ data: { name: `${row.lastName} family` } });
    const client = await prisma.client.create({
      data: {
        publicId: await nextClientPublicId(),
        householdId: household.id,
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        status: "enrolled",
        email: EMAIL.test(row.email) ? row.email : null,
        phone: row.phone || null,
        emergencyContactName: row.guardianName || null,
        emergencyContactEmail: EMAIL.test(row.guardianEmail) ? row.guardianEmail : null,
        emergencyContactPhone: row.guardianPhone || null,
        emergencyContactRelation: row.guardianName ? "parent" : null,
        timezone: row.timezone,
        program: "cm2",
      },
    });

    let studentLogin = "";
    let studentTemp = "";
    if (studentLogins && EMAIL.test(row.email) && !(await prisma.user.findUnique({ where: { email: row.email } }))) {
      studentTemp = temporaryPassword();
      await prisma.user.create({
        data: { email: row.email, name, role: "client", clientId: client.id, password: hashPassword(studentTemp), mustChangePassword: true },
      });
      studentLogin = row.email;
    }

    let parentLogin = "";
    let parentTemp = "";
    if (row.guardianName && EMAIL.test(row.guardianEmail) && !knownParent) {
      await prisma.guardian.create({
        data: {
          householdId: household.id,
          name: row.guardianName,
          email: row.guardianEmail,
          relationship: "parent",
          phone: row.guardianPhone || null,
          isEmergencyContact: true,
        },
      });
      if (parentLogins && !(await prisma.user.findUnique({ where: { email: row.guardianEmail } }))) {
        parentTemp = temporaryPassword();
        await prisma.user.create({
          data: { email: row.guardianEmail, name: row.guardianName, role: "guardian", password: hashPassword(parentTemp), mustChangePassword: true },
        });
        parentLogin = row.guardianEmail;
      }
    }

    created += 1;
    report.push([
      String(row.line),
      name,
      `Created ${client.publicId}${row.dateOfBirth ? "" : " (add date of birth)"}`,
      studentLogin,
      studentTemp,
      parentLogin,
      parentTemp,
    ]);
  }

  await audit("ClientsImported", "Client", "bulk", user.id, { rows: rows.length, created });

  return new NextResponse(toCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="coach-me-2-import-results.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
