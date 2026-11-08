import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { denyClosed } from "@/lib/gate";
import { prisma } from "@/lib/db";

function assessTraining(body: string) {
  const lower = body.toLowerCase();
  const cues: string[] = [];
  if (lower.includes("sat") || lower.includes("study") || lower.includes("practice")) {
    cues.push("Academic training focus detected");
  }
  if (lower.includes("stress") || lower.includes("anxious") || lower.includes("overwhelm")) {
    cues.push("Well-being stress signal — coach may want a check-in");
  }
  if (lower.includes("proud") || lower.includes("better") || lower.includes("win")) {
    cues.push("Positive momentum — reinforce the habit");
  }
  if (cues.length === 0) {
    cues.push("General reflection captured — follow up on consistency and mood next session");
  }
  return cues.join(". ") + ".";
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const closed = await denyClosed(user, request);
  if (closed) return closed;
  if (user.role === "guardian") {
    return NextResponse.redirect(
      new URL("/workspace?error=Parents%20cannot%20access%20student%20journal", request.url),
      303,
    );
  }

  const form = await request.formData();
  const clientId = String(form.get("clientId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || "Journal entry";
  const body = String(form.get("body") ?? "").trim();
  const resourceUrl = String(form.get("resourceUrl") ?? "").trim() || null;
  const visibilityRaw = String(form.get("visibility") ?? "shared");
  const visibility =
    visibilityRaw === "coach_only" || visibilityRaw === "client_private"
      ? visibilityRaw
      : "shared";

  const access = await canAccessClient(user, clientId);
  if (!access.ok) {
    return NextResponse.redirect(new URL("/journal?error=Access%20denied", request.url), 303);
  }

  if (!body) {
    return NextResponse.redirect(
      new URL(`/clients/${clientId}/journal?error=Entry%20required`, request.url),
      303,
    );
  }

  if (user.role === "client" && visibility === "coach_only") {
    return NextResponse.redirect(
      new URL(`/clients/${clientId}/journal?error=Invalid%20visibility`, request.url),
      303,
    );
  }

  const aiAssessment =
    user.role === "client" || visibility === "shared" ? assessTraining(body) : null;

  await prisma.journalEntry.create({
    data: {
      clientId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      title,
      body,
      visibility: isStaff(user) && visibilityRaw === "coach_only" ? "coach_only" : visibility,
      resourceUrl,
      aiAssessment,
    },
  });

  const dest =
    user.role === "client" ? "/journal" : `/clients/${clientId}/journal`;
  return NextResponse.redirect(new URL(dest, request.url), 303);
}
