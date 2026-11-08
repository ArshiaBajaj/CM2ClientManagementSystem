import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { FORM_AUDIENCES, FORM_STAGES, parseFieldSpec } from "@/lib/forms";

function back(request: NextRequest, key: string, message: string, edit?: string) {
  const url = new URL("/forms/builder", request.url);
  url.searchParams.set(key, message);
  if (edit) url.searchParams.set("edit", edit);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "save");

  if (intent === "toggle") {
    const t = await prisma.formTemplate.findUnique({ where: { id } });
    if (!t) return back(request, "error", "Form not found");
    await prisma.formTemplate.update({ where: { id }, data: { active: !t.active } });
    return back(request, "notice", t.active ? `${t.name} turned off` : `${t.name} turned on`);
  }

  const name = String(form.get("name") ?? "").trim();
  const stage = String(form.get("stage") ?? "pre");
  const audience = String(form.get("audience") ?? "client");
  const description = String(form.get("description") ?? "").trim();
  const spec = String(form.get("spec") ?? "");

  if (!name) return back(request, "error", "Give the form a name", id || "new");
  if (!(stage in FORM_STAGES) || !(audience in FORM_AUDIENCES)) return back(request, "error", "Choose a stage and who fills it out", id || "new");

  const { fields, errors } = parseFieldSpec(spec);
  if (errors.length) return back(request, "error", errors.slice(0, 3).join(". "), id || "new");

  if (id) {
    const existing = await prisma.formTemplate.findUnique({ where: { id }, include: { _count: { select: { submissions: true } } } });
    if (!existing) return back(request, "error", "Form not found");
    const oldIds = new Set((JSON.parse(existing.schemaJson) as Array<{ id: string }>).map((f) => f.id));
    const dropped = [...oldIds].filter((fid) => !fields.some((f) => f.id === fid));
    await prisma.formTemplate.update({
      where: { id },
      data: { name, stage, audience, description, schemaJson: JSON.stringify(fields) },
    });
    const warn =
      existing._count.submissions > 0 && dropped.length
        ? ` Note: ${dropped.length} question${dropped.length === 1 ? " was" : "s were"} renamed or removed; earlier answers keep their old wording in exports.`
        : "";
    return back(request, "notice", `${name} saved.${warn}`, id);
  }

  let key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "form";
  if (await prisma.formTemplate.findUnique({ where: { key } })) key = `${key}_${Date.now().toString(36)}`;
  const created = await prisma.formTemplate.create({
    data: { key, name, stage, audience, description, schemaJson: JSON.stringify(fields) },
  });
  return back(request, "notice", `${name} created`, created.id);
}
