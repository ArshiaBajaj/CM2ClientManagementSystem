import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(request: NextRequest, path: string, key: string, message: string) {
  return NextResponse.redirect(new URL(`${path}?${key}=${encodeURIComponent(message)}`, request.url), 303);
}

/** Public endpoint behind the website's "Get a coach" button; managers can also close requests. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "submit");

  if (intent === "close") {
    const user = await getSession();
    if (!user || !isLeadOrAdmin(user)) return NextResponse.redirect(new URL("/login", request.url), 303);
    await prisma.coachRequest.updateMany({
      where: { id: String(form.get("requestId") ?? "") },
      data: { status: "closed" },
    });
    return back(request, "/matching", "notice", "Request closed");
  }

  if (String(form.get("website") ?? "")) return back(request, "/get-a-coach", "sent", "1");

  const studentName = String(form.get("studentName") ?? "").trim().slice(0, 120);
  const studentEmail = String(form.get("studentEmail") ?? "").trim().toLowerCase().slice(0, 200);
  const parentName = String(form.get("parentName") ?? "").trim().slice(0, 120);
  const parentEmail = String(form.get("parentEmail") ?? "").trim().toLowerCase().slice(0, 200);

  if (!studentName) return back(request, "/get-a-coach", "error", "Please add the student's name");
  if (!EMAIL.test(studentEmail)) return back(request, "/get-a-coach", "error", "Please add a valid student email");
  if (parentEmail && !EMAIL.test(parentEmail)) return back(request, "/get-a-coach", "error", "The parent email looks incorrect");

  const recent = await prisma.coachRequest.count({
    where: { studentEmail, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (recent > 0) return back(request, "/get-a-coach", "sent", "1");

  await prisma.coachRequest.create({
    data: {
      studentName,
      studentEmail,
      parentName,
      parentEmail,
      grade: String(form.get("grade") ?? "").slice(0, 4),
      timezone: String(form.get("timezone") ?? "America/New_York").slice(0, 60),
      interests: form.getAll("interests").map(String).join(", ").slice(0, 400),
      preferredTimes: form.getAll("preferredTimes").map(String).join(",").slice(0, 200),
      notes: String(form.get("notes") ?? "").trim().slice(0, 1000),
    },
  });

  return back(request, "/get-a-coach", "sent", "1");
}
