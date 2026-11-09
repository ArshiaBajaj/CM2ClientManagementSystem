import type { Metadata } from "next";
import Link from "next/link";
import { WorldGlobe } from "@/components/world-globe";
import { Card, CtaBand, Section } from "@/components/site/ui";
import { countryCounts } from "@/lib/world";

export const metadata: Metadata = { title: "World View" };
export const dynamic = "force-dynamic";

const STEPS = [
  { title: "Opt in", body: "In your portal, choose your country and what you care about. Nothing else about you is shared." },
  { title: "A parent says yes", body: "Circles open only after a parent or guardian agrees in their family portal." },
  { title: "Meet your circle", body: "3–6 teens from at least two countries who care about the same thing, with a Coach Me 2 coach moderating." },
];

export default async function WorldViewPage() {
  const counts = await countryCounts();
  const countries = counts.map((c) => c.country);

  return (
    <>
      <section className="border-b border-ink/10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-16 sm:pt-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">World View</p>
            <h1 className="mt-6 font-display text-6xl leading-[1] sm:text-7xl">
              You&apos;re not the only one <em className="text-accent-deep">figuring it out.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink/75">
              Coach Me 2 teens live all over the world. World View shows where, and matches teens who care about the same
              things into small, coach-moderated circles across borders.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/world" className="btn">
                Join from your portal
              </Link>
              <Link href="/scheduling" className="btn-secondary">
                New here? Get a coach
              </Link>
            </div>
          </div>
          <figure>
            <WorldGlobe
              highlight={countries}
              label={
                countries.length
                  ? `Globe showing ${countries.length} countries with Coach Me 2 teens.`
                  : "Globe. Countries light up as teens join World View."
              }
            />
            <figcaption className="mt-4 text-center text-sm text-ink/70">Drag to turn the globe. Countries only, never cities.</figcaption>
          </figure>
        </div>
      </section>

      <Section eyebrow="Where Coach Me 2 teens are" title={countries.length ? `${countries.length} countries and counting.` : "Opening now."}>
        {countries.length ? (
          <ul className="columns-2 gap-8 text-[15px] sm:columns-3 lg:columns-4">
            {counts.map((c) => (
              <li key={c.country} className="mb-2 break-inside-avoid">
                <span className="font-medium">{c.country}</span>{" "}
                <span className="text-ink/70">· {c.count < 3 ? "a few teens" : `${c.count} teens`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="max-w-xl text-ink/75">Countries appear here as Coach Me 2 teens add theirs in the portal.</p>
        )}
      </Section>

      <Section eyebrow="How circles work" title="Safe by design, from the first step.">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rule pt-5">
              <span className="font-mono text-xs tracking-[0.2em] text-ink/60">0{i + 1}</span>
              <h3 className="mt-3 font-display text-3xl">{step.title}</h3>
              <p className="mt-2 text-[15px] text-ink/75">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card title="What stays private">
            No last names, photos, schools, cities, phone numbers, or social handles. Members see first names and
            countries only.
          </Card>
          <Card title="Who’s watching out">
            Every circle has a Coach Me 2 coach who reads along and keeps conversations kind and on topic. Never
            one-on-one between teens.
          </Card>
        </div>
      </Section>

      <CtaBand
        title="Already a Coach Me 2 teen?"
        body="Open World View in your portal, add your country and interests, and ask a parent to say yes."
        href="/world"
        cta="Open World View"
      />
    </>
  );
}
