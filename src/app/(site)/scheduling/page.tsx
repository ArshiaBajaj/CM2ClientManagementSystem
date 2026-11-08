import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHero, Section } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Get a coach" };

export default function SchedulingPage() {
  return (
    <>
      <PageHero eyebrow="Get a coach" title="Your ideas. Real impact. Make life different today.">
        <p>
          Start with a 20-minute discovery call with Rebecca, or tell us what you&apos;d like help with and we&apos;ll
          suggest coaches who fit. Already a client? Sign in to your portal.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <article className="panel flex flex-col rounded-xl border-accent/30 p-6">
            <p className="label-caps text-accent">Talk first</p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Discovery call</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">
              Twenty minutes with Rebecca. If 1:1 coaching is a fit, we match you with a coach and set your family up in
              the Coach Me 2 portal after you meet.
            </p>
            <a href={LINKS.discoveryCall} target="_blank" rel="noreferrer" className="btn mt-5">
              Book a 20-minute call
            </a>
          </article>
          <article className="panel flex flex-col rounded-xl p-6">
            <p className="label-caps text-accent">Ready to start</p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Request a coach</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">
              Tell us what you&apos;d like help with and when you&apos;re free. A program lead reviews three coaches who
              fit your schedule and goals, then reaches out to get you started.
            </p>
            <Link href="/get-a-coach" className="btn-secondary mt-5">
              Request a coach
            </Link>
          </article>
          <article className="panel flex flex-col rounded-xl p-6">
            <p className="label-caps text-accent">Already a client</p>
            <h3 className="mt-2 font-display text-xl font-semibold tracking-tight">Sign in to your portal</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">
              Appointments, chat with your coach, goals, journal, forms, and documents to sign. Parents see sessions,
              credits, and progress updates.
            </p>
            <Link href="/login" className="btn-secondary mt-5">
              Sign in
            </Link>
          </article>
        </div>
      </Section>
      <Section eyebrow="Ways to grow" title="Pick what fits.">
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="1:1 Coaching" href="/services" cta="Services">
            Clarify what matters. Navigate challenges. Build habits. You stay in charge.
          </Card>
          <Card title="Group coaching" href="/group-experiences" cta="Groups">
            Ikigai, decisions, courage, discomfort — with other teens in the room.
          </Card>
          <Card title="EvolvED Leaders" href="/content" cta="EvolvED">
            Lead yourself first. Then influence others. Certificate at the end.
          </Card>
        </div>
      </Section>
    </>
  );
}
