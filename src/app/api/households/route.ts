import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { nextClientPublicId } from "@/lib/ids";
import { ensureWallet, addCredits } from "@/lib/credits";

function enrollError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/clients/new?error=${encodeURIComponent(message)}`, request.url),
    303,
  );
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || !isLeadOrAdmin(user)) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const form = await request.formData();
  const householdName = String(form.get("householdName") ?? "").trim();
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const dateOfBirth = String(form.get("dateOfBirth") ?? "").trim();
  const clientEmail = String(form.get("clientEmail") ?? "").toLowerCase().trim();
  const clientPhone = String(form.get("clientPhone") ?? "").trim();
  const guardianName = String(form.get("guardianName") ?? "").trim();
  const guardianEmail = String(form.get("guardianEmail") ?? "").toLowerCase().trim();
  const guardianPhone = String(form.get("guardianPhone") ?? "").trim();
  const relationship = String(form.get("relationship") ?? "parent").trim() || "parent";
  const createGuardianLogin = String(form.get("createGuardianLogin") ?? "") === "1";
  const starterCredits = Number(form.get("starterCredits") ?? 0);
  const createClientLogin = String(form.get("createClientLogin") ?? "") === "1";
  const timezone = String(form.get("timezone") ?? "America/New_York");
  const location = String(form.get("location") ?? "").trim();
  const group = String(form.get("group") ?? "").trim();
  const interests = form.getAll("interests").map(String).filter(Boolean).join(", ");
  const preferredTimes = form.getAll("preferredTimes").map(String).filter(Boolean).join(",");
  const requestId = String(form.get("requestId") ?? "").trim();
  const coachId = String(form.get("coachId") ?? "").trim();

  if (!householdName || !firstName || !lastName || !dateOfBirth) {
    return enrollError(request, "Household name, client name, and date of birth are required");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return enrollError(request, "Date of birth must be YYYY-MM-DD");
  }

  if ((guardianName && !guardianEmail) || (!guardianName && guardianEmail)) {
    return enrollError(request, "Guardian name and email are both required when adding a guardian");
  }

  if (createClientLogin && !clientEmail) {
    return enrollError(request, "Add the student's email to create their login");
  }
  if (createClientLogin && (await prisma.user.findUnique({ where: { email: clientEmail } }))) {
    return enrollError(request, "That student email already has a login");
  }

  const publicId = await nextClientPublicId();

  const household = await prisma.household.create({
    data: { name: householdName },
  });

  await ensureWallet(household.id);

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
      location: location || null,
      group: group || null,
      interests,
      preferredTimes,
    },
  });

  if (createClientLogin) {
    await prisma.user.create({
      data: {
        email: clientEmail,
        name: `${firstName} ${lastName}`,
        password: hashPassword("demo1234"),
        role: "client",
        clientId: client.id,
        mustChangePassword: true,
      },
    });
  }

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

    if (createGuardianLogin) {
      const existingUser = await prisma.user.findUnique({ where: { email: guardianEmail } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: guardianEmail,
            name: guardianName,
            password: hashPassword("demo1234"),
            role: "guardian",
            mustChangePassword: true,
          },
        });
      }
    }
  }

  if (Number.isFinite(starterCredits) && starterCredits > 0) {
    await addCredits({
      householdId: household.id,
      delta: Math.floor(starterCredits),
      reason: "starter_pack_on_enroll",
      actorId: user.id,
    });
  }

  if (coachId) {
    const coach = await prisma.coachRoster.findUnique({ where: { coachId } });
    if (coach?.status === "active") {
      const assignment = await prisma.assignment.create({
        data: { coachId, clientId: client.id, status: "active" },
      });
      await prisma.sessionAllowance.create({
        data: { assignmentId: assignment.id, allowed: 12, used: 0, remaining: 12 },
      });
    }
  }

  if (requestId) {
    await prisma.coachRequest.updateMany({
      where: { id: requestId },
      data: { status: "enrolled", chosenCoachId: coachId || null },
    });
  }

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "ClientEnrolled",
      entity: "Client",
      entityId: client.id,
      metadata: JSON.stringify({ publicId, householdId: household.id }),
    },
  });

  return NextResponse.redirect(new URL(`/clients/${client.id}`, request.url), 303);
}
