import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { addCredits, ensureWallet } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const pack = Number(form.get("pack") ?? 6);
  const custom = Number(form.get("amount") ?? 0);
  const householdIdInput = String(form.get("householdId") ?? "").trim();
  const returnTo = String(form.get("returnTo") ?? "");

  let householdId = householdIdInput;
  if (user.role === "guardian") {
    householdId = (await getGuardianHouseholdId(user)) ?? "";
  } else if (user.role === "coach") {
    const permissions = await getPermissions();
    const coachId = await resolveCoachId(user);
    const coaches = await prisma.assignment.findFirst({
      where: { coachId: coachId ?? "", status: "active", client: { householdId } },
    });
    if (!permissions.coachesCanAddCredits || !coaches) {
      return NextResponse.redirect(new URL("/workspace?error=Only%20managers%20can%20add%20credits", request.url), 303);
    }
  } else if (!isLeadOrAdmin(user)) {
    return NextResponse.redirect(new URL("/workspace?error=Not%20allowed", request.url), 303);
  }

  if (!householdId) {
    return NextResponse.redirect(new URL("/credits?error=Household%20required", request.url), 303);
  }

  const staffCustom = user.role !== "guardian" && Number.isFinite(custom) && custom >= 1 && custom <= 48;
  const amount = staffCustom ? Math.floor(custom) : [6, 12, 24].includes(pack) ? pack : 6;
  await ensureWallet(householdId);
  await addCredits({
    householdId,
    delta: amount,
    reason: staffCustom ? "credits_added_by_staff" : `pack_purchase_${amount}`,
    actorId: user.id,
  });

  await prisma.auditEvent.create({
    data: {
      actorId: user.id,
      action: "CreditsAdded",
      entity: "CreditWallet",
      entityId: householdId,
      metadata: JSON.stringify({ amount }),
    },
  });

  const notice = encodeURIComponent(`${amount} credits added`);
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=${notice}`, request.url), 303);
  }
  const dest = isLeadOrAdmin(user) ? `/credits?householdId=${householdId}&notice=${notice}` : `/credits?notice=${notice}`;
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
