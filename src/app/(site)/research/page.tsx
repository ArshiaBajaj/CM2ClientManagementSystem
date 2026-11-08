import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/ui";
import { UpdateCards } from "@/components/site/updates";
import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Research" };
export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const [settings, updates] = await Promise.all([
    getProgramSettings(),
    prisma.programUpdate.findMany({ where: { published: true, kind: "research" }, orderBy: { publishedAt: "desc" } }),
  ]);

  return (
    <>
      <PageHero eyebrow="Research" title="What our research interns are finding.">
        <p>Findings from our coaches and research interns, including how teens&apos; sense of fulfillment changes over a coaching program.</p>
        {settings.researchUrl ? (
          <p>
            <a href={settings.researchUrl} target="_blank" rel="noreferrer" className="btn">
              See all research ↗
            </a>
          </p>
        ) : null}
      </PageHero>
      <Section>
        {updates.length === 0 ? (
          <p className="text-ink/55">New entries will appear here soon.</p>
        ) : (
          <UpdateCards updates={updates} />
        )}
      </Section>
    </>
  );
}
