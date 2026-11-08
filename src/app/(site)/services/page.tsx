import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART, LINKS } from "@/content/site";

export const metadata: Metadata = { title: "1:1 coaching" };

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow="Services" title="1:1 personalized coaching." art={ART.oneOnOne}>
        <p>Mental well-being. Life. Health. Same respect. Different focus.</p>
      </PageHero>
      <Section>
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
