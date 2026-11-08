import type { Metadata } from "next";
import { CtaBand, PageHero, Section } from "@/components/site/ui";

export const metadata: Metadata = { title: "Our mission" };

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Our mission" title="Every teen deserves a real person in their corner." />
      <Section>
        <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-ink/75">
          <p>
            At CoachMe2.world, we believe that every teen needs the freedom to shape their own experience of the world.
            Every teen deserves to have the support of a nonjudgemental, real life person helping them dream and discover
            where they want to go, why they want to go there, and how they can get there. Every teen should have a safe
            space to explore what is most meaningful to them and why. That’s why our mission is simple yet powerful: to
            provide frictionless and affordable coaching services to all 14-19 year-olds around the globe.
          </p>
          <p>
            We know that you are tired of the heavy-handed control from outside influences who are trying to make money
            off of you and your behaviors regardless of the impact on you, control you because of their own fears or
            anxieties, or live vicariously through you because they came up short. You want to break free, explore your
            passions, make your own decisions and set your own goals. We know that the only true expert on you, is YOU!
          </p>
          <p>
            Here, you’ll find a community that respects your autonomy and values your voice. By choosing to engage with
            CoachMe2.world, you’re joining an elite group of forward-thinkers who are ready to take charge. With our
            coaching services, you’ll have a dedicated coach walking alongside you as you work toward achieving YOUR
            goals. Make no mistake—you call the shots!
          </p>
          <p>
            Teens today are facing unprecedented challenges, and we’re taking action together to create a healthier
            future. By becoming part of CoachMe2.world, you will gain not only the tools and support you need to achieve
            your goals but also the respect that comes from taking an active role in your own life. So, are you ready to
            redefine what success looks like for you?
          </p>
        </div>
      </Section>
      <CtaBand
        title="Ready to redefine success for you?"
        body="Join an elite group of forward-thinkers who are ready to take charge."
        href="/scheduling"
        cta="Get a coach"
        secondary={{ href: "/meet-our-coaches", label: "Meet our coaches" }}
      />
    </>
  );
}
