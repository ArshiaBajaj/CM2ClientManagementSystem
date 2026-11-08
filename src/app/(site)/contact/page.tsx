import type { Metadata } from "next";
import { Card, PageHero, Section } from "@/components/site/ui";
import { Notice } from "@/components/shell";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Contact" };

const TOPICS = ["General", "Coaching", "Partnership", "Volunteering", "Press"];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; message?: string; sent?: string; error?: string }>;
}) {
  const { topic, message, sent, error } = await searchParams;
  const selected = TOPICS.includes(topic ?? "") ? topic : "General";

  return (
    <>
      <PageHero eyebrow="Contact" title="We’d love to hear from you.">
        <p>Questions about coaching, volunteering, partnerships, or anything else — send a note or book a 20-minute call.</p>
      </PageHero>
      <Section>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="panel rounded-xl p-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Send a message</h2>
            {sent ? (
              <p role="status" className="mt-4 rounded-md bg-accent/10 px-3 py-3 text-accent-deep">
                Thanks — your message is in. We’ll get back to you as soon as we can.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink/60">We’ll get back to you as soon as we can.</p>
                <Notice error={error} />
                <form action="/api/site/inquiries" method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="kind" value="contact" />
                  <input type="hidden" name="returnTo" value="/contact" />
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                  <label className="block text-sm font-medium">
                    Name
                    <input name="name" required autoComplete="name" className="field" />
                  </label>
                  <label className="block text-sm font-medium">
                    Email
                    <input type="email" name="email" required autoComplete="email" className="field" />
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Topic
                    <select name="topic" defaultValue={selected} className="field">
                      {TOPICS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Message
                    <textarea name="message" required rows={6} defaultValue={message ?? ""} className="field" />
                  </label>
                  <div className="sm:col-span-2">
                    <button className="btn">Send</button>
                  </div>
                </form>
              </>
            )}
          </div>
          <div className="grid gap-5">
            <Card title="Email" href={`mailto:${LINKS.email}`} cta="Email us">
              Reach Rebecca directly at {LINKS.email}.
            </Card>
            <Card title="Prefer to talk?" href={LINKS.discoveryCall} cta="Schedule a call">
              A 20-minute discovery call is the fastest way to see if coaching is a fit.
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
}
