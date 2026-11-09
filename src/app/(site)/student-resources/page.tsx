import type { Metadata } from "next";
import Link from "next/link";
import { Card, CtaBand, PageHero, Section, SmartLink } from "@/components/site/ui";
import { CRISIS_LINES, LINKS, RESOURCES, type Resource } from "@/content/site";

export const metadata: Metadata = { title: "Student resources" };

const CATEGORIES: Array<Resource["category"]> = ["CoachMe2", "Mind & mood", "School & college", "Life & future"];

export default async function StudentResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = CATEGORIES.find((c) => c === category) ?? null;
  const shown = active ? RESOURCES.filter((r) => r.category === active) : RESOURCES;

  return (
    <>
      <PageHero eyebrow="Student resources" title="Tools for the life you actually want.">
        <p>
          Crisis lines, college help, wellbeing guides, and CoachMe2 programs — kept free or affordable so every teen
          14–19 can have a real person in their corner.
        </p>
      </PageHero>

      <Section id="help-now" eyebrow="If you need help now" title="You do not have to wait for a coach.">
        <p className="-mt-4 mb-6 max-w-2xl text-ink/65">
          Coaching is not therapy or crisis care. If you are in immediate danger, call local emergency services. These
          lines are free, confidential, and staffed by people whose job is to stay with you.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CRISIS_LINES.map((line) => (
            <Card key={line.title} tag={line.tag} title={line.title} href={line.href} cta="Get help">
              {line.body}
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="From CoachMe2" title="Coaching, kept within reach.">
        <p className="-mt-4 mb-6 max-w-2xl text-ink/65">
          We are a 501(c)(3). Donors, volunteers, and intern-built tools keep 1:1, groups, and EvolvED frictionless.
        </p>
        <div className="grid gap-5 md:grid-cols-3">
          <Card tag="1:1" title="Personalized coaching" href="/services" cta="See services">
            A dedicated coach. Mental well-being, life, health — you stay in charge. Start with a free 20-minute
            discovery call.
          </Card>
          <Card tag="Groups" title="Find your ikigai" href="/group-experiences" cta="See groups">
            A 12-week cohort on meaning, strengths, belonging, and contribution. About $15 a session because we are a
            nonprofit.
          </Card>
          <Card tag="EvolvED" title="Lead yourself first" href="/content" cta="Discover EvolvED">
            A 12-week leadership lab. Values, courage, recovery, voice — plus a certificate you can actually use.
          </Card>
        </div>
      </Section>

      <Section eyebrow="Open library" title="Handpicked. Actually useful." intro="Public, reputable resources we send students to — not ads, not paywalls.">
        <nav aria-label="Filter resources" className="flex flex-wrap gap-2">
          <FilterLink href="/student-resources" active={!active}>
            All
          </FilterLink>
          {CATEGORIES.map((c) => (
            <FilterLink key={c} href={`/student-resources?category=${encodeURIComponent(c)}#library`} active={active === c}>
              {c}
            </FilterLink>
          ))}
        </nav>
        <ul id="library" className="mt-6 grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <li key={r.title} className="panel flex flex-col rounded-xl p-5">
              <p className="label-caps text-accent">{r.category}</p>
              <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{r.title}</h3>
              <p className="mt-1 flex-1 text-sm text-ink/65">{r.body}</p>
              <SmartLink href={r.href} className="link-accent mt-3 text-sm">
                {r.cta} {r.href.startsWith("http") ? "↗" : "›"}
              </SmartLink>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand
        title="Make your life different today."
        body="A 20-minute discovery call. If money is the reason you haven’t asked — tell us. We are a nonprofit. We will find a way."
        href={LINKS.discoveryCall}
      />
    </>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
        active ? "border-accent bg-accent text-white" : "border-ink/15 bg-white text-ink/70 hover:border-ink/30"
      }`}
    >
      {children}
    </Link>
  );
}
