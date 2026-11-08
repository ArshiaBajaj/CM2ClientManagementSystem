import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHero, Section } from "@/components/site/ui";
import { Notice } from "@/components/shell";
import { httpsUrl } from "@/lib/public-url";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Get involved" };

const LANES = [
  "Website successor (CS / maintenance)",
  "General internship",
  "Research",
  "Social & marketing",
  "Curriculum",
  "Podcast",
];

export default async function VolunteerPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const onboardingUrl = httpsUrl(process.env.ONBOARDING_APP_URL);

  return (
    <>
      <PageHero eyebrow="Get involved" title="Find your lane. Then tell us.">
        <p>Teen looking for a coach? Pro coach? Future intern? Start here.</p>
      </PageHero>
      <Section>
        <div className="grid gap-5 md:grid-cols-3">
          <Card title="Find your coach" href="/scheduling" cta="See how to start">
            A 20-minute discovery call with Rebecca to see if coaching is right for you, or a quick form so we can suggest
            coaches who fit.
          </Card>
          <article className="panel flex flex-col rounded-xl p-6">
            <h3 className="font-display text-xl font-semibold tracking-tight">Volunteer as a coach</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">
              Interested in volunteering as a coach? Meet with our Founder and CEO to talk about joining the work. After
              you’re activated, you sign in to the Coach Me 2 portal and finish your coach agreement, safeguarding
              acknowledgement, and coaching profile before students open.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a href={LINKS.discoveryCall} target="_blank" rel="noreferrer" className="link-accent">
                Meet with Rebecca ›
              </a>
              {onboardingUrl ? (
                <a href={onboardingUrl} className="link-accent">
                  Start coach onboarding ›
                </a>
              ) : null}
              <Link href="/login" className="link-accent">
                Already activated? Sign in ›
              </Link>
            </div>
          </article>
          <Card title="Website successor" href="#apply" cta="Apply">
            High school CS student to maintain coachme2.world and the Coach Me 2 portal after our current interns
            graduate. Interviews with Rebecca.
          </Card>
        </div>
      </Section>

      <Section eyebrow="Intern with us" title="Tell us the lane." className="scroll-mt-24">
        <div id="apply" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div id="website-successor" className="panel rounded-xl p-6">
            <p className="text-ink/70">
              Website successor, research, social, curriculum — tell us the lane. If you’re applying to maintain the
              site, say so. We’ll follow up, then interview with Rebecca.
            </p>
            {sent ? (
              <p role="status" className="mt-4 rounded-md bg-accent/10 px-3 py-3 text-accent-deep">
                Thanks — your application is in. We’ll follow up by email.
              </p>
            ) : (
              <>
                <Notice error={error} />
                <form action="/api/site/inquiries" method="post" className="mt-5 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="kind" value="intern_application" />
                  <input type="hidden" name="returnTo" value="/volunteer" />
                  <input type="hidden" name="topic" value="Internship application" />
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                  <label className="block text-sm font-medium">
                    Name
                    <input name="name" required autoComplete="name" className="field" />
                  </label>
                  <label className="block text-sm font-medium">
                    Email
                    <input type="email" name="email" required autoComplete="email" className="field" />
                  </label>
                  <label className="block text-sm font-medium">
                    School
                    <input name="school" className="field" />
                  </label>
                  <label className="block text-sm font-medium">
                    Year
                    <select name="year" className="field" defaultValue="">
                      <option value="">Select</option>
                      <option>Freshman</option>
                      <option>Sophomore</option>
                      <option>Junior</option>
                      <option>Senior</option>
                      <option>College / other</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    What do you want to work on?
                    <select name="lane" className="field" defaultValue={LANES[0]}>
                      {LANES.map((lane) => (
                        <option key={lane}>{lane}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium sm:col-span-2">
                    Why this, and when could you start?
                    <textarea name="message" rows={5} className="field" />
                  </label>
                  <div className="sm:col-span-2">
                    <button className="btn">Send</button>
                  </div>
                </form>
              </>
            )}
          </div>
          <Card title="Already an intern?" href="/login" cta="Open the intern workspace">
            Interns and their parents sign the intern forms in the portal. Once both are signed, the intern workspace
            opens: your team, team chat, tasks, and shared documents.
          </Card>
        </div>
      </Section>
    </>
  );
}
