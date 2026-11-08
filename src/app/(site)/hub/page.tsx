import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { isLeadOrAdmin } from "@/lib/access";
import { httpsUrl } from "@/lib/public-url";
import { PageHero, Section, SmartLink } from "@/components/site/ui";
import { LINKS } from "@/content/site";

export const metadata: Metadata = { title: "Coach Me 2 hub" };

type Tile = { href: string; title: string; body: string };

/** One place that holds everything Coach Me 2 runs: the site, the portal, podcast, research, and ways to help. */
export default async function HubPage() {
  const user = await getSession();
  const portal = user ? await homeFor(user) : "/login";
  const onboardingUrl = httpsUrl(process.env.ONBOARDING_APP_URL);

  const groups: Array<{ title: string; tiles: Tile[] }> = [
    {
      title: "Coaching",
      tiles: [
        { href: "/scheduling", title: "Get a coach", body: "Discovery call, or request a coach matched to your schedule and goals." },
        { href: "/services", title: "1:1 coaching", body: "Mental well-being, life, health. You stay in charge." },
        { href: "/group-experiences", title: "Group coaching", body: "Find your ikigai with a cohort of 12–16 teens." },
        { href: "/content", title: "EvolvED leadership", body: "A 12-week leadership lab with a certificate." },
      ],
    },
    {
      title: "The portal",
      tiles: [
        { href: portal, title: user ? "My portal" : "Sign in", body: "Appointments, chat, goals, journal, forms, and documents." },
        { href: "/values", title: "Values & world view", body: "Students: take the values inventory and see your world view map." },
        { href: "/portfolio", title: "Achievement portfolio", body: "Students: collect what you've built and what you're proud of." },
        {
          href: onboardingUrl ?? "/volunteer",
          title: "Coach onboarding",
          body: "Apply, clear safeguarding, then sign your coach forms in the portal.",
        },
        { href: "/intern/start", title: "Intern workspace", body: "Interns and parents sign forms, then the team workspace opens." },
      ],
    },
    {
      title: "Listen, read, learn",
      tiles: [
        { href: "/podcast", title: "Podcast", body: "Teens and coaches on pressure, purpose, and what helps." },
        { href: "/research", title: "Research", body: "What our research interns are finding." },
        { href: "/student-resources", title: "Student resources", body: "Crisis lines, college help, and wellbeing guides." },
        { href: LINKS.newsletter, title: "Newsletter", body: "Program dates, webinars, and EvolvED invites." },
      ],
    },
    {
      title: "People & support",
      tiles: [
        { href: "/about", title: "Mission & story", body: "Why every teen deserves a coach." },
        { href: "/meet-our-coaches", title: "Coaches", body: "Credentialed coaches, ready when you are." },
        { href: "/innovators", title: "Interns & innovators", body: "The students building Coach Me 2." },
        { href: "/volunteer", title: "Volunteer or intern", body: "Coach, build, research, or tell our story." },
        { href: "/donate", title: "Donate", body: "100% of gifts through Zeffy go to the work." },
        { href: "/contact", title: "Contact", body: "Questions, partnerships, press." },
      ],
    },
  ];

  if (user && isLeadOrAdmin(user)) {
    groups.unshift({
      title: "For managers",
      tiles: [
        { href: "/workspace", title: "Workspace home", body: "To-dos, new coach requests, and this week's sessions." },
        { href: "/inbox", title: "Website inbox", body: "Contact messages, intern applications, and quiz sign-ups." },
        { href: "/updates", title: "Website updates", body: "Post podcast episodes, research, and program news." },
        { href: "/matching", title: "Matching", body: "Pair students with coaches." },
      ],
    });
  }

  return (
    <>
      <PageHero eyebrow="Coach Me 2 hub" title="Everything Coach Me 2, in one place.">
        <p>
          The website, the client portal, the podcast, research, and every way to get involved — one front door for
          teens, parents, coaches, interns, and partners.
        </p>
      </PageHero>
      {groups.map((group) => (
        <Section key={group.title} title={group.title}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.tiles.map((tile) => (
              <li key={tile.title}>
                <SmartLink
                  href={tile.href}
                  className="panel flex h-full flex-col rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-accent/40"
                >
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {tile.title} {tile.href.startsWith("http") ? "↗" : ""}
                  </span>
                  <span className="mt-1 text-sm text-ink/65">{tile.body}</span>
                </SmartLink>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      <Section title="Follow along">
        <ul className="flex flex-wrap gap-3">
          {LINKS.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className="btn-secondary">
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
