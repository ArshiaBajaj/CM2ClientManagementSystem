import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { httpsUrl } from "@/lib/public-url";
import { getProgramSettings } from "@/lib/settings";

/** Read-only feed the main Coach Me 2 website can embed: portal links plus podcast/research updates. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const [settings, updates] = await Promise.all([
    getProgramSettings(),
    prisma.programUpdate.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" }, take: 20 }),
  ]);

  return NextResponse.json(
    {
      links: {
        getACoach: `${origin}/get-a-coach`,
        portalSignIn: `${origin}/login`,
        becomeACoach: httpsUrl(process.env.ONBOARDING_APP_URL),
        podcast: settings.podcastUrl || null,
        research: settings.researchUrl || null,
      },
      updates: updates.map((u) => ({
        kind: u.kind,
        title: u.title,
        summary: u.summary,
        url: u.url || null,
        publishedAt: u.publishedAt.toISOString(),
      })),
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } },
  );
}
