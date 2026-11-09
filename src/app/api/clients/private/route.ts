import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveCoachId } from "@/lib/access";
import { coachGate } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { nextPrivateClientPublicId } from "@/lib/ids";
import { CASELOAD_COOKIE } from "@/lib/caseload";
import { setFlash, temporaryPassword } from "@/lib/security";

function back(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/clients/private/new?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

/** A coach adds one of their own clients. Only that coach can see or work with them. */
export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "coach") return NextResponse.redirect(new URL("/login", request.url), 303);
  if ((await coachGate(user)) !== "ready") return NextResponse.redirect(new URL("/onboarding", request.url), 303);
  const coachId = await resolveCoachId(user);
  if (!coachId) return back(request, "Your coach profile isn't active yet");

  const form = await request.formData();
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const firstName = text("firstName");
  const lastName = text("lastName");
  const dateOfBirth = text("dateOfBirth");
  const clientEmail = text("clientEmail").toLowerCase();
  const clientPhone = text("clientPhone");
  const timezone = text("timezone") || "America/New_York";
  const guardianName = text("guardianName");
  const guardianEmail = text("guardianEmail").toLowerCase();
  const guardianPhone = text("guardianPhone");
  const relationship = text("relationship") || "parent";
  const createClientLogin = text("createClientLogin") === "1";

  if (!firstName || !lastName || !dateOfBirth) return back(request, "Name and date of birth are required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return back(request, "Date of birth must be YYYY-MM-DD");
  if ((guardianName && !guardianEmail) || (!guardianName && guardianEmail)) {
    return back(request, "Add both the guardian's name and email, or leave both blank");
  }
  if (createClientLogin && !clientEmail) return back(request, "Add the client's email to create their login");
  if (createClientLogin && (await prisma.user.findUnique({ where: { email: clientEmail } }))) {
    return back(request, "That email already has a login");
  }

  const publicId = await nextPrivateClientPublicId();
  const household = await prisma.household.create({ data: { name: `${lastName} (private)` } });
  const client = await prisma.client.create({
    data: {
      publicId,
      householdId: household.id,
      firstName,
      lastName,
      dateOfBirth,
      status: "enrolled",
      email: clientEmail || null,
      phone: clientPhone || null,
      emergencyContactName: guardianName || null,
      emergencyContactEmail: guardianEmail || null,
      emergencyContactPhone: guardianPhone || null,
      emergencyContactRelation: guardianName ? relationship : null,
      timezone,
      program: "private",
      ownerCoachId: coachId,
    },
  });

  // The assignment is what opens calendar, chat, notes, and forms for this coach.
  await prisma.assignment.create({ data: { coachId, clientId: client.id, status: "active" } });

  if (guardianName && guardianEmail) {
    await prisma.guardian.create({
      data: {
        householdId: household.id,
        name: guardianName,
        email: guardianEmail,
        relationship,
        phone: guardianPhone || null,
        isEmergencyContact: true,
      },
    });
  }

  if (createClientLogin) {
    const temp = temporaryPassword();
    await setFlash(`Temporary password for ${clientEmail} (shown once): ${temp}. They pick their own at first sign-in.`);
    await prisma.user.create({
      data: {
        email: clientEmail,
        name: `${firstName} ${lastName}`,
        password: hashPassword(temp),
        role: "client",
        clientId: client.id,
        mustChangePassword: true,
      },
    });
  }

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "PrivateClientAdded",
      entity: "Client",
      entityId: client.id,
      metadata: JSON.stringify({ coachId }),
    },
  });

  const response = NextResponse.redirect(new URL(`/clients/${client.id}`, request.url), 303);
  response.cookies.set(CASELOAD_COOKIE, "private", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
