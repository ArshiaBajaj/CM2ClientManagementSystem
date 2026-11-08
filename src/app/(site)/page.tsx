import Link from "next/link";
import { prisma } from "@/lib/db";
import { siteAsset } from "@/lib/site-assets";
import { CheckInQuiz } from "@/components/site/check-in-quiz";
import { CtaBand, Section, SmartLink } from "@/components/site/ui";
import { UpdateCards } from "@/components/site/updates";
import {
  ART,
  COACHING_IS_NOT,
  FEATURED_QUOTE,
  HOME_PROGRAMS,
  LINKS,
  QUIZ_PROMPTS,
  TESTIMONIALS,
} from "@/content/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const updates = await prisma.programUpdate.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-10 pt-14 sm:pt-20 md:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="label-caps text-accent">We help teens get what they want</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
            Everyone deserves a coach.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink/70">
            Personalized coaching for ages 14–19. Frictionless. Affordable. You call the shots — a dedicated coach walks
            with you from where you are to where you want to be.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/scheduling" className="btn">
              Get a coach
            </Link>
            <Link href="/about" className="btn-secondary">
              Learn more ›
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink/55">
            Already have a coach?{" "}
            <Link href="/login" className="link-accent">
              Sign in to your portal
            </Link>
          </p>
        </div>
        <figure className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm">
          <img
            src={siteAsset(ART.founder) ?? ""}
            alt="Rebecca Oertell, founder of Coach Me 2"
            className="aspect-[4/5] w-full rounded-2xl bg-mist object-cover shadow-soft"
          />
          <figcaption className="panel absolute -bottom-4 left-4 rounded-lg px-3 py-2 text-sm">
            <span className="font-semibold">Rebecca O.</span> <span className="text-ink/55">· Founder &amp; coach</span>
          </figcaption>
        </figure>
      </section>

      {/* Programs */}
      <Section eyebrow="Designed for real life" title="Three ways to grow.">
        <div className="grid gap-5 md:grid-cols-3">
          {HOME_PROGRAMS.map((program) => (
            <article key={program.href} className="panel flex flex-col rounded-xl p-6">
              <img src={siteAsset(program.art) ?? ""} alt="" className="h-24 w-24" />
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">{program.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">{program.body}</p>
              <Link href={program.href} className="link-accent mt-4 text-sm">
                {program.cta} ›
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm text-ink/60">
          Also taking shape:{" "}
          <Link href="/decision-making" className="link-accent">
            a decision-making series
          </Link>{" "}
          for majors, extracurriculars, and the rest of the messy menu.
        </p>
      </Section>

      {/* Testimonials */}
      <Section eyebrow="From students" title="Heard. Challenged. Supported.">
        <div className="grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <figure key={t.who} className="panel rounded-xl p-6">
              <blockquote className="text-ink/80">“{t.quote}”</blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-ink/60">— {t.who}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* Quiz */}
      <Section
        eyebrow="You deserve a coach if"
        title="If any of this sounds familiar."
        intro="Tap what feels true. A short check-in follows — then you can join the list."
      >
        <CheckInQuiz prompts={QUIZ_PROMPTS.map((p) => ({ text: p.text, art: siteAsset(p.art) }))} />
      </Section>

      {/* What coaching is */}
      <Section eyebrow="What coaching is" title="A relationship that builds motivation, capacity, and follow-through.">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-lg leading-relaxed text-ink/70">
              A coach helps you uncover why you want to begin — and the belief that you can. Coaching is focused on
              thriving: from where you are now to where you want to be.
            </p>
            <figure className="mt-8 border-l-4 border-accent pl-5">
              <blockquote className="font-display text-xl leading-snug tracking-tight">“{FEATURED_QUOTE.quote}”</blockquote>
              <figcaption className="mt-3 text-sm font-semibold uppercase tracking-wider text-ink/50">{FEATURED_QUOTE.who}</figcaption>
            </figure>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COACHING_IS_NOT.map((item) => (
              <div key={item.title} className="panel rounded-xl p-5">
                <h3 className="font-display text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-1 text-sm text-ink/65">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Ways in: the portal, coaching, podcast and research all start here */}
      <Section eyebrow="Coach Me 2, all in one place" title="Find your way in.">
        <div className="grid gap-5 md:grid-cols-3">
          <WayIn title="Get a coach" body="Book a free 20-minute discovery call, or tell us what you'd like help with and we'll suggest coaches who fit." href="/scheduling" cta="Start here" primary />
          <WayIn title="I already have a coach" body="Sign in to see appointments, chat with your coach, track your goals, and sign documents." href="/login" cta="Go to my portal" />
          <WayIn title="Become a coach or intern" body="Credentialed coaches and students who want to build tools, curriculum, research, and stories." href="/volunteer" cta="Get involved" />
        </div>
      </Section>

      {updates.length > 0 ? (
        <Section eyebrow="Podcast and research" title="The latest from our coaches and interns.">
          <UpdateCards updates={updates} />
          <div className="mt-5 flex gap-4 text-sm">
            <Link href="/podcast" className="link-accent">
              All episodes ›
            </Link>
            <Link href="/research" className="link-accent">
              All research ›
            </Link>
          </div>
        </Section>
      ) : null}

      <CtaBand
        title="Make your life different today."
        body="A 20-minute discovery call. Thoughtful, unhurried, and entirely about what you need."
        href={LINKS.discoveryCall}
        cta="Schedule a call"
        secondary={{ href: "/scheduling", label: "Other ways to start" }}
      />
    </>
  );
}

function WayIn({
  title,
  body,
  href,
  cta,
  primary,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <article className="panel flex flex-col rounded-xl p-6">
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-ink/65">{body}</p>
      <SmartLink href={href} className={primary ? "btn mt-5" : "btn-secondary mt-5"}>
        {cta}
      </SmartLink>
    </article>
  );
}
