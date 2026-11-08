import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { PORTFOLIO_CATEGORIES, PORTFOLIO_LEVELS, suggestCategory, suggestLevel } from "@/lib/portfolio";
import { csvCell } from "@/lib/forms";

async function resolveClient(request: NextRequest, requested: string | null) {
  const user = await getSession();
  if (!user) return { user: null, clientId: null };
  const clientId = user.role === "client" ? user.clientId : isStaff(user) ? requested : null;
  if (!clientId || !(await canAccessClient(user, clientId)).ok) return { user, clientId: null };
  return { user, clientId };
}

export async function GET(request: NextRequest) {
  const { clientId } = await resolveClient(request, request.nextUrl.searchParams.get("clientId"));
  if (!clientId) return NextResponse.redirect(new URL("/workspace", request.url));
  const items = await prisma.portfolioItem.findMany({ where: { clientId }, orderBy: [{ gradeYear: "asc" }, { createdAt: "asc" }] });
  const rows = [
    ["Grade", "Category", "Level", "Title", "Description (Common App limit 150 characters)", "Hours", "Date"],
    ...items.map((i) => [
      String(i.gradeYear),
      PORTFOLIO_CATEGORIES[i.category as keyof typeof PORTFOLIO_CATEGORIES] ?? i.category,
      PORTFOLIO_LEVELS[i.level as keyof typeof PORTFOLIO_LEVELS] ?? i.level,
      i.title,
      i.description.slice(0, 150),
      i.hours ? String(i.hours) : "",
      i.occurredOn ?? "",
    ]),
  ];
  return new NextResponse(rows.map((r) => r.map(csvCell).join(",")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-portfolio.csv"',
    },
  });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const { user, clientId } = await resolveClient(request, String(form.get("clientId") ?? ""));
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const base = user.role === "client" ? "/portfolio" : `/portfolio?clientId=${clientId}`;
  const go = (key: string, message: string) =>
    NextResponse.redirect(new URL(`${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(message)}`, request.url), 303);
  if (!clientId) return NextResponse.redirect(new URL("/workspace?error=Access%20denied", request.url), 303);

  const intent = String(form.get("intent") ?? "add");
  const id = String(form.get("id") ?? "");

  if (intent === "delete") {
    await prisma.portfolioItem.deleteMany({ where: { id, clientId } });
    return go("notice", "Removed");
  }

  if (intent === "level") {
    const level = String(form.get("level") ?? "");
    if (!(level in PORTFOLIO_LEVELS)) return go("error", "Choose a level");
    await prisma.portfolioItem.updateMany({ where: { id, clientId }, data: { level, levelSource: "manual" } });
    return go("notice", "Level updated");
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 140);
  const description = String(form.get("description") ?? "").trim().slice(0, 1000);
  const gradeYear = Number(form.get("gradeYear") ?? 0);
  const hours = Number(form.get("hours") ?? 0);
  if (!title) return go("error", "Give it a title");
  if (![9, 10, 11, 12].includes(gradeYear)) return go("error", "Choose the grade");

  const categoryInput = String(form.get("category") ?? "auto");
  const levelInput = String(form.get("level") ?? "auto");
  const category = categoryInput in PORTFOLIO_CATEGORIES ? categoryInput : suggestCategory(title, description);
  const level = levelInput in PORTFOLIO_LEVELS ? levelInput : suggestLevel(title, description);

  await prisma.portfolioItem.create({
    data: {
      clientId,
      title,
      description,
      gradeYear,
      category,
      level,
      levelSource: levelInput in PORTFOLIO_LEVELS ? "manual" : "auto",
      occurredOn: String(form.get("occurredOn") ?? "") || null,
      hours: Number.isFinite(hours) && hours > 0 ? Math.round(hours) : null,
    },
  });
  return go(
    "notice",
    `Added "${title}" as ${PORTFOLIO_LEVELS[level as keyof typeof PORTFOLIO_LEVELS].toLowerCase()} level. Change it if that's not right.`,
  );
}
