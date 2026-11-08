import type { Metadata } from "next";
import Link from "next/link";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART, IKIGAI_COMPASS } from "@/content/site";

export const metadata: Metadata = { title: "Group coaching" };

export default function GroupExperiencesPage() {
  return (
    <>
      <PageHero eyebrow="Now enrolling Fall 2026" title="Find your ikigai. With a crew." art={ART.group}>
        <p>
          Ikigai (生き甲斐) is a Japanese idea of a reason for being: what you love, what you’re good at, what the world
          needs, what you can be paid for. $240 for the foundational experience — about $15 a session.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="What’s inside">
            12-week foundation, September–November: meaning, joy, energy, strengths, belonging, contribution. Design an
            intentional high school. Then monthly coaching January–April. Cohorts of 12–16. 90 minutes weekly. 20–30
            minutes of experiments between sessions.
          </Card>
          <Card title="How it works">
            Sign up in 9th or 10th grade. We’ll place you by schedule and time zone — your school, your community, or an
            international mix. Alumni renewal, monthly follow-on, and a senior integration for students who stay the whole
            journey.
          </Card>
        </div>
      </Section>
      <Section eyebrow="The ikigai compass" title="Six directions to explore.">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {IKIGAI_COMPASS.map((point) => (
            <li key={point.name} className="panel rounded-xl p-5">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-accent">{point.name}</p>
              <p className="mt-2 text-ink/70">{point.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink/60">
          <Link href="/decision-making" className="link-accent">
            Decision-making series
          </Link>{" "}
          ($90, 6 weeks) coming soon — majors, extracurriculars, asking someone out, the whole messy menu.
        </p>
      </Section>
      <CtaBand
        title="I want in."
        body="Tell us you’re interested and we’ll place you in a cohort that fits your schedule."
        href="/contact?topic=Coaching&message=I%27d%20like%20to%20join%20an%20ikigai%20group."
        cta="I want in"
      />
    </>
  );
}
