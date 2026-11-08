import type { Metadata } from "next";
import { CtaBand, PageHero, PeopleGrid, Section } from "@/components/site/ui";
import { COACHES, LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Our coaches" };

export default function CoachesPage() {
  return (
    <>
      <PageHero eyebrow="Coaches" title="Meet our coaches.">
        <p>
          Trained, credentialed, and ready when you are. Start with a 20-minute discovery call with Rebecca to see if
          coaching is the right fit.
        </p>
      </PageHero>
      <Section>
        <PeopleGrid people={COACHES} />
      </Section>
      <CtaBand
        title="Start with a discovery call."
        body="Twenty minutes with Rebecca. If 1:1 coaching is a fit, we'll match you with a coach and set you up in the Coach Me 2 portal."
        href={LINKS.discoveryCall}
        cta="Book a discovery call"
        secondary={{ href: "/volunteer", label: "Become a coach" }}
      />
    </>
  );
}
