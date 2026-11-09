import Link from "next/link";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { CRISIS_NOTE, LINKS, PRIMARY_NAV } from "@/content/site";
import { NavHere } from "@/components/site/nav-here";

/** Header and footer for every public CoachMe2.world page (and the sign-in and Get a coach forms). */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  const portalHref = user ? await homeFor(user) : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Slim utility bar: help first, always. */}
      <div className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2 text-[13px]">
          <Link href="/student-resources#help-now" className="font-semibold underline-offset-4 hover:underline">
            Need help right now? <span className="font-normal text-paper/80">Call or text 988</span>
          </Link>
          <nav aria-label="Utility" className="flex items-center gap-5">
            <Link href="/donate" className="hover:underline">
              Donate
            </Link>
            <Link href={portalHref} className="hover:underline">
              {user ? "My portal" : "Sign in"}
            </Link>
          </nav>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="shrink-0" aria-label="CoachMe2.world home">
            <img src="/brand/coachme2-logo.png" alt="" width={1024} height={221} className="h-8 w-auto" />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <NavHere key={item.href} href={item.href}>
                {item.label}
              </NavHere>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/scheduling" className="btn">
              Get a coach
            </Link>
            <details className="relative lg:hidden">
              <summary className="btn-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">Menu</summary>
              <div className="panel absolute right-0 top-full z-50 mt-2 w-[min(86vw,20rem)] rounded-2xl p-3 shadow-soft">
                <ul>
                  {PRIMARY_NAV.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-paper">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li className="rule mt-2 pt-2">
                    <Link href="/hub" className="block rounded-lg px-3 py-3 text-sm text-ink/70 hover:bg-paper">
                      Find anything (site map)
                    </Link>
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="page-enter flex-1 outline-none">
        {children}
      </main>

      <footer className="mt-24 border-t border-ink/15 bg-surface/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <p className="font-display text-3xl leading-tight">
                From where you are, <em className="text-accent-deep">to where you want to be.</em>
              </p>
              <p className="mt-4 max-w-xs text-sm text-ink/70">
                Coach Me 2, Inc. is a 501(c)(3) nonprofit offering affordable coaching to teens 14–19 worldwide.
              </p>
            </div>
            <FooterColumn
              title="Start"
              links={[
                ["/scheduling", "Get a coach"],
                ["/services", "Coaching programs"],
                ["/parents", "For parents"],
                ["/student-resources", "Student resources"],
                ["/world-view", "World View"],
              ]}
            />
            <FooterColumn
              title="Coach Me 2"
              links={[
                ["/about", "Mission & people"],
                ["/podcast", "Podcast"],
                ["/research", "Research"],
                ["/partners", "Schools & partners"],
                ["/contact", "Contact"],
              ]}
            />
            <FooterColumn
              title="Help out"
              links={[
                ["/volunteer", "Coach, intern, volunteer"],
                ["/donate", "Donate"],
                [LINKS.newsletter, "Newsletter"],
                ["/hub", "Site map"],
              ]}
            />
          </div>
          <div className="rule mt-12 flex flex-col gap-4 pt-6 text-sm text-ink/70 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl">{CRISIS_NOTE}</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LINKS.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="hover:text-ink">
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink/60">
            <span>© {new Date().getFullYear()} Coach Me 2, Inc.</span>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/accessibility" className="hover:text-ink">
              Accessibility
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="label-caps">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[15px]">
        {links.map(([href, label]) => (
          <li key={href}>
            {href.startsWith("http") ? (
              <a href={href} target="_blank" rel="noreferrer" className="text-ink/80 hover:text-ink">
                {label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link href={href} className="text-ink/80 hover:text-ink">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
