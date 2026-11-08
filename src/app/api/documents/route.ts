import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

function go(request: NextRequest, key: string, message: string) {
  return NextResponse.redirect(new URL(`/documents?${key}=${encodeURIComponent(message)}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const intent = String(form.get("intent") ?? "sign");

  if (intent === "template") {
    if (!isLeadOrAdmin(user)) return go(request, "error", "Managers only");
    const id = String(form.get("id") ?? "");
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const signers = form.getAll("signers").map(String).filter((s) => s === "client" || s === "guardian");
    if (!title || !body) return go(request, "error", "Title and text are required");
    if (signers.length === 0) return go(request, "error", "Choose who signs");
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    if (id) {
      const existing = await prisma.documentTemplate.findUnique({ where: { id } });
      if (!existing) return go(request, "error", "Document not found");
      const changed = existing.body !== body;
      const version = changed ? new Date().toISOString().slice(0, 10) : existing.version;
      await prisma.documentTemplate.update({
        where: { id },
        data: { title, body, signers: signers.join(","), version, active: String(form.get("active") ?? "") === "1" },
      });
      return go(request, "notice", changed ? "Saved as a new version. Everyone will be asked to sign again." : "Saved");
    }
    if (await prisma.documentTemplate.findUnique({ where: { key } })) return go(request, "error", "A document with that title exists");
    await prisma.documentTemplate.create({ data: { key, title, body, signers: signers.join(",") } });
    return go(request, "notice", "Document added");
  }

  const documentId = String(form.get("documentId") ?? "");
  const clientId = String(form.get("clientId") ?? "");
  const typedName = String(form.get("signature") ?? "").trim();
  const agreed = String(form.get("agree") ?? "") === "1";
  const role = user.role === "client" ? "client" : user.role === "guardian" ? "guardian" : null;
  if (!role) return go(request, "error", "Only students and parents sign documents");

  const access = await canAccessClient(user, clientId);
  if (!access.ok) return go(request, "error", "Access denied");
  const doc = await prisma.documentTemplate.findUnique({ where: { id: documentId } });
  if (!doc || !doc.active || !doc.signers.split(",").includes(role)) return go(request, "error", "Document not found");
  if (!agreed) return go(request, "error", "Tick the box to confirm you agree");
  if (typedName.length < 3) return go(request, "error", "Type your full name to sign");

  await prisma.documentSignature.upsert({
    where: { documentId_clientId_signerRole: { documentId, clientId, signerRole: role } },
    update: { signerName: typedName, signerUserId: user.id, version: doc.version, signedAt: new Date() },
    create: { documentId, clientId, signerRole: role, signerName: typedName, signerUserId: user.id, version: doc.version },
  });
  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "DocumentSigned",
      entity: "DocumentTemplate",
      entityId: documentId,
      metadata: JSON.stringify({ clientId, role, version: doc.version }),
    },
  });

  if (doc.key === "ai_scribe_consent" && role === "client") {
    await prisma.client.update({ where: { id: clientId }, data: { aiScribeOptOut: false } });
  }

  return go(request, "notice", `Signed: ${doc.title}`);
}
