import type { Metadata } from "next";
import { PageHero, Section } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Privacy" };

// Plain-language description of how the portal actually works. Have Coach Me 2's counsel review before launch.
const POINTS = [
  {
    title: "Coaching stays between a teen and their coach",
    body: "Coaching notes, journal entries, goals, and chat are visible only to the teen, their coach, and the program leads who supervise coaching. Parents see logistics: sessions, credits, documents to sign, and short progress updates the coach chooses to share. The exception is an emergency.",
  },
  {
    title: "What we collect",
    body: "Names, contact details, date of birth, emergency contacts, session times, goals, forms you fill in, and messages you send in the portal. The public website stores the details you send through its forms.",
  },
  {
    title: "How it’s protected",
    body: "Encrypted connections (HTTPS) everywhere, hashed passwords, sign-out after 30 minutes without activity, lockout after repeated wrong passwords, role-based access, and a log of who opened each client record.",
  },
  {
    title: "Notifications and calendars",
    body: "If you turn on phone or Apple Watch notifications, they say who and when, never what was written. Calendar links show session times and your coach’s or student’s first name only.",
  },
  {
    title: "World View",
    body: "The World View map shows countries, never cities or addresses. Teens join cross-border circles only with a parent’s permission, and every circle is moderated by a Coach Me 2 coach.",
  },
  {
    title: "We don’t sell data",
    body: "We never sell or rent personal information, and we don’t run advertising trackers on the site or portal.",
  },
  {
    title: "Your choices",
    body: `Ask to see, correct, or delete your information by emailing ${LINKS.email}. A parent or guardian can make requests for a teen under 18.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy" title="How we handle your information.">
        <p>Plain language first. If anything here is unclear, write to us and we’ll explain.</p>
      </PageHero>
      <Section>
        <dl className="max-w-3xl divide-y divide-ink/10">
          {POINTS.map((p) => (
            <div key={p.title} className="py-7">
              <dt className="font-display text-2xl">{p.title}</dt>
              <dd className="mt-2 text-[16px] leading-relaxed text-ink/80">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}
