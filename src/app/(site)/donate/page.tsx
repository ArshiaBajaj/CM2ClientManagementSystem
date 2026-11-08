import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Donate" };

export default function DonatePage() {
  return (
    <>
      <PageHero eyebrow="Donate now" title="Help more teens get a coach.">
        <p>
          We are a 501(c)(3) nonprofit. We are just getting started. Our mission is simple and powerful: frictionless,
          affordable coaching for teens 14–19 around the world. Build self-efficacy, competence, confidence,
          decision-making, resilience, and a community that knows teens are capable of so much more than we ask of them.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Make a gift</h2>
            <p className="mt-3 text-ink/70">Give securely through Zeffy. 100% of your donation goes to Coach Me 2.</p>
            <p className="mt-4 text-ink/70">
              All teens deserve physical and mental well-being. We want teens to thrive — not just survive. Thank you for
              supporting this work.
            </p>
          </div>
          <div className="panel overflow-hidden rounded-xl">
            <iframe
              title="Donate to Coach Me 2 through Zeffy"
              src={LINKS.zeffyEmbed}
              className="h-[1100px] w-full border-0"
              allow="payment"
              loading="lazy"
            />
          </div>
        </div>
      </Section>
    </>
  );
}
