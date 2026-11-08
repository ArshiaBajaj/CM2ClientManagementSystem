import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/ui";
import { UpdateCards } from "@/components/site/updates";
import { prisma } from "@/lib/db";
import { getProgramSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Podcast" };
export const dynamic = "force-dynamic";

export default async function PodcastPage() {
  const [settings, updates] = await Promise.all([
    getProgramSettings(),
    prisma.programUpdate.findMany({ where: { published: true, kind: "podcast" }, orderBy: { publishedAt: "desc" } }),
  ]);

  return (
    <>
      <PageHero eyebrow="Podcast" title="Teens and coaches, talking honestly.">
        <p>Coach Me 2 students, coaches, and guests on pressure, purpose, and what actually helps.</p>
        {settings.podcastUrl ? (
          <p>
            <a href={settings.podcastUrl} target="_blank" rel="noreferrer" className="btn">
              Listen on our podcast page ↗
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
