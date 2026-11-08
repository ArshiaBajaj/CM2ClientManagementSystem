import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART, LINKS } from "@/content/site";

export const metadata: Metadata = { title: "For teens" };

export default function TeensPage() {
  return (
    <>
      <PageHero eyebrow="For teens" title="You call the shots." art={ART.oneOnOne}>
        <p>
          Personalized coaching for ages 14–19. A dedicated coach walks with you from where you are to where you want to
          be — without anyone else writing the script.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Personalized coaching" href="/services" cta="See services">
            A dedicated coach. Mental well-being, life, health — you stay in charge. Start with a free 20-minute
            discovery call.
          </Card>
          <Card title="Find your ikigai" href="/group-experiences" cta="See groups">
            A 12-week cohort on meaning, strengths, belonging, and contribution. About $15 a session because we are a
            nonprofit.
          </Card>
          <Card title="Lead yourself first" href="/content" cta="Discover EvolvED">
            A 12-week leadership lab. Values, courage, recovery, voice — plus a certificate you can actually use.
          </Card>
        </div>
      </Section>
      <Section eyebrow="Start here" title="Tools, people, and a next step.">
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Get a coach" href="/scheduling" cta="See how to start">
            A 20-minute discovery call with Rebecca, or a quick form so we can suggest coaches who fit. Thoughtful,
            unhurried, and about you.
          </Card>
          <Card title="Student resources" href="/student-resources" cta="Open the library">
            Crisis lines, college help, wellbeing guides — kept free or affordable.
          </Card>
          <Card title="Meet the innovators" href="/innovators" cta="See who is building">
            Teens already building curriculum, research, digital tools, and the stories we tell.
          </Card>
        </div>
      </Section>
      <CtaBand
        title="Make your life different today."
        body="A 20-minute discovery call. If money is the reason you haven’t asked — tell us."
        href={LINKS.discoveryCall}
      />
    </>
  );
}
