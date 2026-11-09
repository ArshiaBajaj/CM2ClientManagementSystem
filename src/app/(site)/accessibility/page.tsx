import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <>
      <PageHero eyebrow="Accessibility" title="Built for everyone who needs a coach.">
        <p>
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA across the website and the
          portal.
        </p>
      </PageHero>
      <Section>
        <div className="max-w-3xl space-y-6 text-[16px] leading-relaxed text-ink/80">
          <p>
            Every page works with a keyboard, shows a clear focus outline, and starts with a “Skip to content” link. Text
            meets contrast minimums, images have descriptions, form fields have labels, motion turns off when your device
            asks for reduced motion, and buttons are large enough to tap.
          </p>
          <p>
            If something is hard to use, or you need information in another format, email{" "}
            <a href={`mailto:${LINKS.email}`} className="link-accent">
              {LINKS.email}
            </a>{" "}
            and we’ll help directly and fix the problem.
          </p>
        </div>
      </Section>
    </>
  );
}
