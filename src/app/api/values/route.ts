import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VALUE_PAIRS, scoreValues, topValues } from "@/lib/values";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user || user.role !== "client" || !user.clientId) {
    return NextResponse.redirect(new URL("/workspace?error=Only%20students%20take%20the%20inventory", request.url), 303);
  }

  const form = await request.formData();

  if (String(form.get("intent") ?? "") === "share") {
    const latest = await prisma.valuesResult.findFirst({ where: { clientId: user.clientId }, orderBy: { createdAt: "desc" } });
    if (latest) {
      await prisma.valuesResult.update({ where: { id: latest.id }, data: { sharePeers: !latest.sharePeers } });
    }
    return NextResponse.redirect(new URL("/values", request.url), 303);
  }

  const choices: Record<number, number> = {};
  VALUE_PAIRS.forEach(([a, b], i) => {
    const value = Number(form.get(`pair_${i}`));
    if (value === a || value === b) choices[i] = value;
  });
  if (Object.keys(choices).length < VALUE_PAIRS.length) {
    return NextResponse.redirect(new URL("/values?retake=1&error=Please%20answer%20every%20question", request.url), 303);
  }

  const scores = scoreValues(choices);
  await prisma.valuesResult.create({
    data: {
      clientId: user.clientId,
      scoresJson: JSON.stringify(scores),
      topValues: topValues(scores).map((v) => v.key).join(","),
      sharePeers: String(form.get("sharePeers") ?? "") === "1",
    },
  });
  return NextResponse.redirect(new URL("/values", request.url), 303);
}
