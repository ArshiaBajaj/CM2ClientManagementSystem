import Link from "next/link";
import { prisma } from "@/lib/db";
import { siteAsset } from "@/lib/site-assets";
import { CheckInQuiz } from "@/components/site/check-in-quiz";
import { CtaBand, Meridians, Section } from "@/components/site/ui";
import { UpdateCards } from "@/components/site/updates";
import {
  APP_FEATURES,
  COACHES,
  COACHING_IS_NOT,
  FEATURED_QUOTE,
  HOME_PROGRAMS,
  LINKS,
  QUIZ_PROMPTS,
  TESTIMONIALS,
} from "@/content/site";

export const dynamic = "force-dynamic";

const DOORS = [
  {
    n: "01",
    who: "I’m a teen",
    line: "You call the shots. Find a coach, a group, or just something useful today.",
    href: "/teens",
    cta: "Start as a teen",
  },
  {
    n: "02",
    who: "I’m a parent",
    line: "How coaching works, what stays private, what you’ll see, and what it costs.",
    href: "/parents",
    cta: "Start as a parent",
  },
  {
    n: "03",
    who: "I want to help",
    line: "Coach, intern, partner with us, or give. Every path is on one page.",
    href: "/volunteer",
    cta: "See ways to help",
  },
];

export default async function HomePage() {
  const updates = await prisma.programUpdate.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink/10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="eyebrow">Coaching for teens 14–19</p>
            <h1 className="mt-6 font-display text-6xl leading-[0.98] sm:text-8xl">
              Everyone deserves <em className="text-accent-deep">a coach.</em>
            </h1>
            <p className="mt-8 max-w-xl text-xl leading-relaxed text-ink/75">
              Frictionless. Affordable. You call the shots — a dedicated coach walks with you from where you are to where
              you want to be.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/scheduling" className="btn px-7 text-base">
                Get a coach
              </Link>
              <Link href="/services" className="btn-secondary px-7 text-base">
                How coaching works
              </Link>
            </div>
          </div>
          <Link href="/world-view" className="group relative mx-auto block w-full max-w-sm text-ink">
            <Meridians className="w-full transition duration-700 group-hover:rotate-[8deg]" />
            <span className="mt-4 block text-center text-sm text-ink/70">
              Teens around the world · <span className="font-display text-lg italic text-ink">explore World View</span>
            </span>
          </Link>
        </div>
      </section>

      {/* Start here: one door for each kind of visitor */}
      <Section eyebrow="Start here" title="Where would you like to go?">
        <ul className="grid gap-px overflow-hidden rounded-[2rem] border border-ink/15 bg-ink/15 md:grid-cols-3">
          {DOORS.map((door) => (
            <li key={door.n} className="bg-surface">
              <Link href={door.href} className="group flex h-full flex-col p-8 transition hover:bg-paper sm:p-10">
                <span className="font-mono text-xs tracking-[0.2em] text-ink/60">{door.n}</span>
                <span className="mt-6 font-display text-4xl leading-tight">{door.who}</span>
                <span className="mt-4 flex-1 text-[15px] leading-relaxed text-ink/75">{door.line}</span>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-accent-deep">
                  {door.cta}
                  <span aria-hidden className="transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink/70">
          Already coaching with us?{" "}
          <Link href="/login" className="link-accent">
            Sign in to your portal
          </Link>
        </p>
      </Section>

      {/* Programs */}
      <section className="border-y border-ink/10 bg-surface/70">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow">Three ways to grow</p>
          <ol className="mt-10 divide-y divide-ink/10">
            {HOME_PROGRAMS.map((program, i) => (
              <li key={program.href}>
                <Link
                  href={program.href}
                  className="group grid items-center gap-4 py-8 md:grid-cols-[3rem_16rem_1fr_6rem] md:gap-6"
                >
                  <span className="font-mono text-xs tracking-[0.2em] text-ink/60">0{i + 1}</span>
                  <span className="font-display text-3xl group-hover:text-accent-deep">{program.title}</span>
                  <span className="text-[15px] leading-relaxed text-ink/75">{program.body}</span>
                  <img src={siteAsset(program.art) ?? ""} alt="" className="hidden h-20 w-20 justify-self-end md:block" />
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink/70">
            Coming soon:{" "}
            <Link href="/decision-making" className="link-accent">
              a decision-making series
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Voices */}
      <Section eyebrow="From students" title="Heard. Challenged. Supported.">
        <figure className="max-w-4xl">
          <blockquote className="font-display text-4xl leading-tight sm:text-5xl">“{FEATURED_QUOTE.quote}”</blockquote>
          <figcaption className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-ink/70">{FEATURED_QUOTE.who}</figcaption>
        </figure>
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.who} className="rule pt-6">
              <blockquote className="text-[17px] leading-relaxed text-ink/85">“{t.quote}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold text-ink/70">{t.who}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* Quiz */}
      <Section
        eyebrow="You deserve a coach if"
        title="Does any of this sound familiar?"
        intro="Tap what feels true. A 60-second check-in follows, then you can join the list."
      >
        <CheckInQuiz prompts={QUIZ_PROMPTS.map((p) => ({ text: p.text, art: siteAsset(p.art) }))} />
      </Section>

      {/* What coaching is */}
      <section className="border-y border-ink/10 bg-surface/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow">What coaching is</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
              A relationship that builds motivation, capacity, and follow-through.
            </h2>
            <p className="mt-6 text-lg text-ink/75">
              A coach helps you uncover why you want to begin — and the belief that you can. {COACHES.length} credentialed
              coaches. Ages 14–19. About $15 a group session, because we&apos;re a nonprofit.
            </p>
          </div>
          <dl className="grid gap-px self-start overflow-hidden rounded-2xl border border-ink/15 bg-ink/15 sm:grid-cols-2">
            {COACHING_IS_NOT.map((item) => (
              <div key={item.title} className="bg-surface p-6">
                <dt className="font-display text-2xl">{item.title}</dt>
                <dd className="mt-2 text-[15px] text-ink/75">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* The portal */}
      <Section
        eyebrow="Your Coach Me 2 portal"
        title="Your coach, your goals, your week — on your phone and your wrist."
        intro="Every teen gets a private portal. Add it to your iPhone Home Screen and reminders reach your Apple Watch."
      >
        <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {APP_FEATURES.map((f, i) => (
            <li key={f.title} className="rule pt-5">
              <span className="font-mono text-xs tracking-[0.2em] text-ink/60">0{i + 1}</span>
              <h3 className="mt-3 font-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-[15px] text-ink/75">{f.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login" className="btn">
            Open the portal
          </Link>
          <Link href="/world-view" className="btn-secondary">
            Explore World View
          </Link>
        </div>
      </Section>

      {updates.length > 0 ? (
        <Section eyebrow="Podcast and research" title="Latest from our coaches and interns">
          <UpdateCards updates={updates} />
        </Section>
      ) : null}

      <CtaBand
        title="Make your life different today."
        body="A 20-minute discovery call. Thoughtful, unhurried, and entirely about what you need. If money is the reason you haven’t asked — tell us."
        href={LINKS.discoveryCall}
        secondary={{ href: "/scheduling", label: "Other ways to start" }}
      />
    </>
  );
}
