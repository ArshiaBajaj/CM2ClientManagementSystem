import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART, LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Coaching" };

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Coaching" title="Coaching that follows what matters to you." art={ART.oneOnOne}>
        <p>One-on-one, in a group, or in a leadership lab. Every program starts with a free 20-minute conversation.</p>
      </PageHero>
      <Section eyebrow="Four programs" title="Pick what fits.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card tag="1:1" title="Personalized coaching" href="#one-on-one" cta="What 1:1 covers">
            A dedicated coach for well-being, life, and health. You stay in charge.
          </Card>
          <Card tag="Groups · Fall 2026" title="Find your ikigai" href="/group-experiences" cta="See group coaching">
            A 12-week cohort of 12–16 teens on meaning, strengths, and belonging. About $15 a session.
          </Card>
          <Card tag="Leadership" title="EvolvED" href="/content" cta="Discover EvolvED">
            A 12-week leadership lab with a certificate you can use on applications.
          </Card>
          <Card tag="Coming soon" title="Decision making" href="/decision-making" cta="Save a seat">
            Six weeks on making real choices with your own judgment.
          </Card>
        </div>
      </Section>
      <Section id="one-on-one" eyebrow="1:1 coaching" title="Mental well-being. Life. Health.">
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Mental well-being">
            Stress, burnout, overwhelm, emotional resilience, mindfulness, school-life balance, relationships. We do not
            diagnose or treat mental health conditions. We help you take proactive steps toward a more balanced life.
          </Card>
          <Card title="Life">
            Education and career, leadership, purpose, time, decisions, hobbies and community. We don’t tell you what to
            do. We help you take control of your unique path.
          </Card>
          <Card title="Health & wellness">
            Nutrition, movement, medical follow-through, self-care, habits, sleep that works for a teen schedule. We don’t
            diagnose. We help you take control of energy and health.
          </Card>
        </div>
      </Section>
      <CtaBand
        title="Get a coach"
        body="Schedule a discovery call to see if coaching is right for you."
        href={LINKS.discoveryCall}
        cta="Schedule a discovery call"
        secondary={{ href: "/get-a-coach", label: "Request a coach" }}
      />
    </>
  );
}
