import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { CRISIS_NOTE, LINKS, NAV } from "@/content/site";

/** Header and footer for every public CoachMe2.world page (and the sign-in and Get a coach forms). */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  const portalHref = user ? await homeFor(user) : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-ink/[0.08] bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="CoachMe2.world home">
            <img src="/brand/coachme2-logo.png" alt="CoachMe2.world" width={1024} height={221} className="h-8 w-auto" />
          </Link>

          {/* Desktop menu: one row of groups, each opens on hover or keyboard focus. */}
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((group) => (
              <div key={group.label} className="group relative">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 text-sm font-medium text-ink/70 transition group-focus-within:text-ink group-hover:text-ink"
                  aria-haspopup="true"
                >
                  {group.label}
                </button>
                <div className="invisible absolute left-0 top-full z-50 w-72 translate-y-1 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <ul className="panel rounded-xl p-2">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="block rounded-lg px-3 py-2 hover:bg-paper focus:bg-paper">
                          <span className="block text-sm font-semibold text-ink">{item.label}</span>
                          {item.blurb ? <span className="block text-xs text-ink/55">{item.blurb}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={portalHref} className="btn-ghost hidden whitespace-nowrap sm:inline-flex">
              {user ? "My portal" : "Sign in"}
            </Link>
            <Link href="/scheduling" className="btn whitespace-nowrap px-4">
              Get a coach
            </Link>
            {/* Mobile menu */}
            <details className="relative lg:hidden">
              <summary className="btn-secondary cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu">
                Menu
              </summary>
              <div className="panel absolute right-0 top-full z-50 mt-2 max-h-[75vh] w-[min(88vw,22rem)] overflow-y-auto rounded-xl p-4">
                <Link href={portalHref} className="btn-secondary mb-3 w-full">
                  {user ? "My portal" : "Sign in"}
                </Link>
                {NAV.map((group) => (
                  <div key={group.label} className="border-t border-ink/[0.08] py-3 first:border-t-0">
                    <p className="label-caps">{group.label}</p>
                    <ul className="mt-1">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link href={item.href} className="block rounded-md py-1.5 text-sm font-medium text-ink/80 hover:text-ink">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main" className="page-enter flex-1">
        {children}
      </main>

      <footer className="mt-20 bg-[#1a3350] text-paper">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="max-w-3xl rounded-lg bg-white/[0.07] px-4 py-3 text-sm text-paper/85">{CRISIS_NOTE}</p>
          <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <span className="inline-flex rounded-md bg-white px-2 py-1.5">
                <img src="/brand/coachme2-logo.png" alt="CoachMe2.world" width={1024} height={221} className="h-7 w-auto" />
              </span>
              <p className="mt-4 max-w-xs text-sm text-paper/70">
                Thank you for supporting our ambitious coaching initiative. Coach Me 2, Inc. is a 501(c)(3) nonprofit
                corporation.
              </p>
              <ul className="mt-4 flex gap-2">
                {LINKS.social.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold hover:bg-white/20"
                    >
                      {s.short}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <FooterColumn
              title="Explore"
              links={[
                ["/about", "Mission"],
                ["/teens", "Teens"],
                ["/parents", "Parents"],
                ["/partners", "Schools & partners"],
                ["/meet-our-coaches", "Coaches"],
                ["/student-resources", "Student resources"],
              ]}
            />
            <FooterColumn
              title="Get involved"
              links={[
                ["/innovators", "Interns & innovators"],
                ["/volunteer", "Volunteer"],
                ["/donate", "Donate"],
                ["/contact", "Contact us"],
                [LINKS.newsletter, "Newsletter"],
              ]}
            />
            <FooterColumn
              title="Coach Me 2"
              links={[
                ["/scheduling", "Get a coach"],
                ["/login", "Client portal"],
                ["/podcast", "Podcast"],
                ["/research", "Research"],
                ["/hub", "The hub"],
              ]}
            />
          </div>
          <p className="mt-10 text-xs text-paper/50">Copyright © {new Date().getFullYear()} Coach Me 2, Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/45">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer" className="text-paper/80 hover:text-white">
                {label} ↗
              </a>
            ) : (
              <Link href={href} className="text-paper/80 hover:text-white">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
