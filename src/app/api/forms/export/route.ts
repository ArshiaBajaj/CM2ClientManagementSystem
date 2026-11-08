import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { csvCell, parseFields, toTenPoint } from "@/lib/forms";

/**
 * Anonymous research export keyed by client ID (no names or emails).
 * `?template=all` gives one row per answer; `?template=<key>` gives one row per submission.
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url));

  const key = request.nextUrl.searchParams.get("template") ?? "all";
  const templates = await prisma.formTemplate.findMany({
    where: key === "all" ? { audience: { not: "scribe" } } : { key },
  });
  const submissions = await prisma.formSubmission.findMany({
    where: { templateId: { in: templates.map((t) => t.id) } },
    include: { client: { select: { publicId: true, group: true } }, template: true },
    orderBy: [{ clientId: "asc" }, { createdAt: "asc" }],
  });

  let rows: string[][];
  if (key === "all") {
    rows = [["client_id", "group", "form", "stage", "submitted_at", "question_id", "question", "answer", "score_0_10"]];
    for (const s of submissions) {
      const fields = parseFields(s.template.schemaJson);
      const answers = JSON.parse(s.answersJson) as Record<string, string>;
      for (const field of fields) {
        const score = toTenPoint(field, answers[field.id] ?? "");
        rows.push([
          s.client.publicId,
          s.client.group ?? "",
          s.template.key,
          s.template.stage,
          s.createdAt.toISOString(),
          field.id,
          field.label,
          answers[field.id] ?? "",
          score === null ? "" : score.toFixed(1),
        ]);
      }
    }
  } else {
    const fields = templates[0] ? parseFields(templates[0].schemaJson) : [];
    rows = [["client_id", "group", "stage", "submitted_at", ...fields.map((f) => f.label)]];
    for (const s of submissions) {
      const answers = JSON.parse(s.answersJson) as Record<string, string>;
      rows.push([
        s.client.publicId,
        s.client.group ?? "",
        s.template.stage,
        s.createdAt.toISOString(),
        ...fields.map((f) => answers[f.id] ?? ""),
      ]);
    }
  }

  await prisma.auditEvent.create({
    data: { actorId: user.id, action: "FormsExported", entity: "FormTemplate", entityId: key, metadata: JSON.stringify({ rows: rows.length - 1 }) },
  });

  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cm2-forms-${key}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
