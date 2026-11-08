import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";

export const metadata: Metadata = { title: "Schools & partners" };

export default function PartnersPage() {
  return (
    <>
      <PageHero eyebrow="Schools & partners" title="Bring coaching to more teens.">
        <p>
          CoachMe2 partners with schools and organizations that want frictionless, affordable coaching for 14–19
          year-olds — without turning well-being into another program teens have to perform.
        </p>
      </PageHero>
      <Section>
        <div id="schools" className="grid scroll-mt-24 gap-5 md:grid-cols-2">
          <Card title="For schools">
            Place students in 1:1 coaching, ikigai groups, or EvolvED leadership labs. Cohorts can form around a school
            schedule and time zone — or mix with an international community. We keep the teen in charge and the school as
            a partner, not the client.
          </Card>
          <Card title="For organizations">
            Community groups, youth programs, and sponsors help us keep coaching affordable worldwide. Tell us who you
            serve. We’ll talk through a partnership that fits.
          </Card>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Card title="Volunteer as a coach" href="/volunteer" cta="Become a coach">
            Credentialed coaches who want to give time. Meet with Rebecca to talk about joining the work.
          </Card>
          <Card title="Intern with us" href="/innovators" cta="Meet our interns & innovators">
            Curriculum, research, digital tools, and strategy — including our full-time intern in Switzerland helping
            shape the five-year plan.
          </Card>
          <Card title="Sponsor the work" href="/donate" cta="Donate">
            100% of gifts through Zeffy go to Coach Me 2. We are a 501(c)(3).
          </Card>
        </div>
      </Section>
      <CtaBand
        title="Let’s build this together."
        body="Schools, partners, and sponsors — send a note and we’ll follow up."
        href="/contact?topic=Partnership"
        cta="Start a partnership"
      />
    </>
  );
}
