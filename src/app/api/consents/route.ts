import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "").trim();
  const kind = String(form.get("kind") ?? "guardian_program_consent").trim();
  const version = String(form.get("version") ?? "2026.09").trim();
  const grantedBy = String(form.get("grantedBy") ?? user.name).trim();

  const access = await canAccessClient(user, clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/workspace?error=Access%20denied", request.url), 303);
  }

  if (user.role !== "guardian" && !isLeadOrAdmin(user)) {
    return NextResponse.redirect(
      new URL(`/clients/${clientId}?error=Only%20guardians%20or%20leads%20can%20record%20consent`, request.url),
      303,
    );
  }

  const consent = await prisma.consent.create({
    data: { clientId, kind, version, grantedBy },
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "ConsentRecorded",
      entity: "Consent",
      entityId: consent.id,
      metadata: JSON.stringify({ kind, version }),
    },
  });

  if (user.role === "guardian") {
    return NextResponse.redirect(new URL("/workspace", request.url), 303);
  }
  return NextResponse.redirect(new URL(`/clients/${clientId}`, request.url), 303);
}
