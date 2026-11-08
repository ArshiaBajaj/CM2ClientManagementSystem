import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART, EVOLVED_PILLARS } from "@/content/site";

export const metadata: Metadata = { title: "EvolvED leadership" };

export default function EvolvedPage() {
  return (
    <>
      <PageHero eyebrow="EvolvED Leadership" title="Ready for what comes next." art={ART.evolved}>
        <p>
          A 12-week, research-informed leadership experience for high schoolers. You do not need a title. Before you lead
          a team, you learn to lead yourself.
        </p>
      </PageHero>
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVOLVED_PILLARS.map((pillar) => (
            <li key={pillar.name} className="panel rounded-xl p-5">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-accent">{pillar.name}</p>
              <p className="mt-2 text-ink/70">{pillar.body}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="How it works">
            Weekly Leadership Lab, peer coaching, challenges, real-world experiments, a Personal Leadership Vision and
            three-goal plan. Completers earn the EvolvED Leadership Certificate — usable on college, scholarship,
            internship, and job apps.
          </Card>
          <Card title="Why now">
            AI is changing learning and work. Leadership is still human. The Harvard Business Impact 2026 Global
            Leadership Study flags adaptability, inquiry, complexity thinking, and leading at the intersection of
            technology and culture.
          </Card>
        </div>
      </Section>
      <CtaBand
        title="Join the next webinar."
        body="Get an invite to the EvolvED info session, or ask us anything about the program."
        href="/contact?topic=Coaching&message=Please%20send%20me%20an%20EvolvED%20webinar%20invite."
        cta="Request a webinar invite"
        secondary={{ href: "/contact?topic=Coaching", label: "Talk to us" }}
      />
    </>
  );
}
