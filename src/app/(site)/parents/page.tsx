import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "For parents" };

const FACTS = [
  { title: "Ages 14–19", body: "High school years, treated with respect." },
  { title: "Nonprofit", body: "501(c)(3). If cost is the barrier, tell us. We’ll find a way." },
  { title: "Credentialed coaches", body: "Trained, boarded, and ready when your teen is." },
  { title: "You stay informed", body: "Logistics with you. The coaching relationship with them." },
];

export default function ParentsPage() {
  return (
    <>
      <PageHero eyebrow="For parents" title="A real person in their corner.">
        <p>
          Coaching gives your teen a nonjudgmental adult who helps them set their own goals — without taking over. You
          stay the parent. They stay in charge of the work.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="What it is">
            A relationship that builds motivation, capacity, and follow-through. Your teen clarifies what matters and
            practices getting there — in 1:1, groups, or EvolvED.
          </Card>
          <Card title="What it isn’t">
            Not therapy, tutoring, consulting, or another adult telling them what to do. We don’t diagnose or treat. We
            help them thrive.
          </Card>
          <Card title="How you can help">
            Book the discovery call. Ask questions. Then give them the space to do the work. Coaches keep the teen as the
            client.
          </Card>
        </div>
      </Section>
      <Section eyebrow="How coaching works" title="Start with a 20-minute conversation." className="scroll-mt-24" >
        <div id="how-it-works" className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 text-lg leading-relaxed text-ink/70">
            <p>
              Rebecca meets you and your teen to see if coaching is a fit. If 1:1 is right, we set your family up in the
              Coach Me 2 portal after you meet. Sessions stay focused on what your teen wants — with privacy that makes
              honesty possible.
            </p>
            <p>
              In the portal, you&apos;ll see upcoming sessions, session credits, documents to sign, and short progress
              updates your teen&apos;s coach shares with you. Coaching conversations themselves stay between your teen and
              their coach, except in an emergency.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FACTS.map((fact) => (
              <li key={fact.title} className="panel rounded-xl p-4">
                <p className="font-display font-semibold tracking-tight">{fact.title}</p>
                <p className="mt-1 text-sm text-ink/65">{fact.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <CtaBand
        title="See if coaching is a fit."
        body="Twenty minutes with Rebecca. Bring your questions. Your teen can join — or you can start the conversation."
        href={LINKS.discoveryCall}
        cta="Book a discovery call"
        secondary={{ href: "/login", label: "Parent sign in" }}
      />
    </>
  );
}
