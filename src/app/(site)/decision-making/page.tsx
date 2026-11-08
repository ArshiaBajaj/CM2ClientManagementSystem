import type { Metadata } from "next";
import { Card, CtaBand, PageHero, Section } from "@/components/site/ui";
import { ART } from "@/content/site";

export const metadata: Metadata = { title: "Decision making" };

export default function DecisionMakingPage() {
  return (
    <>
      <PageHero eyebrow="Coming soon" title="Decision Making." art={ART.decisionMaking}>
        <p>
          A focused series for the choices that actually shape a teen&apos;s life — majors, extracurriculars, asking
          someone out, and the rest of the messy menu. You stay in charge. A coach helps you hear yourself clearly enough
          to choose.
        </p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <Card title="What's taking shape">
            Six weeks. Small cohort. Practice making real decisions with less freeze, less people-pleasing, and more of
            your own judgment. Details and dates will land here when enrollment opens.
          </Card>
          <Card title="Until then" href="/group-experiences" cta="See group experiences">
            Group coaching already works this muscle — ikigai, courage, and comfort with discomfort, in a room of teens
            taking the work seriously.
          </Card>
        </div>
      </Section>
      <CtaBand
        title="Want a seat when it opens?"
        body="Tell us you're interested. We'll follow up when the decision-making series is ready."
        href="/contact?topic=Coaching&message=Save%20me%20a%20seat%20in%20the%20decision-making%20series."
        cta="Talk to us"
      />
    </>
  );
}
