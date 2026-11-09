import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
const CONTACT_EMAIL = "rebecca@coachme2.world";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="label-caps text-accent">Accessibility</p>
        <h1 className="mt-3 font-display text-5xl leading-tight">Built for everyone who needs a coach.</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink/75">
          We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA across the Coach Me 2
          portal.
        </p>
      <div className="mt-10">
        <div className="max-w-3xl space-y-6 text-[16px] leading-relaxed text-ink/80">
          <p>
            Every page works with a keyboard, shows a clear focus outline, and starts with a “Skip to content” link. Text
            meets contrast minimums, images have descriptions, form fields have labels, motion turns off when your device
            asks for reduced motion, and buttons are large enough to tap.
          </p>
          <p>
            If something is hard to use, or you need information in another format, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="link-accent">
              {CONTACT_EMAIL}
            </a>{" "}
            and we’ll help directly and fix the problem.
          </p>
        </div>
      </div>
      </div>
    </PublicShell>
  );
}
