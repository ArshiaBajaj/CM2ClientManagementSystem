import type { Metadata } from "next";
import { CtaBand, PageHero, PeopleGrid, Section } from "@/components/site/ui";
import { INNOVATORS, INTERNS } from "@/content/site";

export const metadata: Metadata = { title: "Interns & innovators" };

export default function InnovatorsPage() {
  return (
    <>
      <PageHero eyebrow="Our people" title="Interns and innovators.">
        <p>
          Students and early-career teammates helping CoachMe2 grow — from the website and curriculum to research,
          social, and the five-year plan.
        </p>
      </PageHero>
      <Section eyebrow="Interns" title="Meet our interns.">
        <PeopleGrid people={INTERNS} />
      </Section>
      <Section
        eyebrow="Innovators"
        title="The people building what’s next."
        intro="Advisors, curriculum partners, and builders alongside the intern team above."
        className="scroll-mt-24"
      >
        <div id="innovators" className="scroll-mt-24">
          <PeopleGrid people={INNOVATORS} />
        </div>
      </Section>
      <CtaBand
        title="Want to intern with us?"
        body="High school CS students: we’re interviewing a website successor before our current intern graduates. Tell us what you want to work on."
        href="/volunteer#apply"
        cta="Apply"
        secondary={{ href: "/login", label: "Intern sign in" }}
      />
    </>
  );
}
