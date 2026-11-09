import Link from "next/link";

const CRISIS_NOTE =
  "Coaching is not therapy or crisis care. If you are in immediate danger, call local emergency services. In the U.S., call or text 988.";

/** Frame for the few pages people see before signing in: sign in, request a coach, privacy, accessibility. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/login" className="flex items-center gap-3" aria-label="Coach Me 2 Client portal">
            <img src="/brand/coachme2-logo.png" alt="" width={1024} height={221} className="h-8 w-auto" />
            <span className="hidden border-l border-ink/15 pl-3 text-sm font-medium text-ink/70 sm:inline">Client portal</span>
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/get-a-coach" className="btn-ghost">
              Request a coach
            </Link>
            <Link href="/login" className="btn px-4">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="page-enter flex-1 outline-none">
        {children}
      </main>
      <footer className="border-t border-ink/10">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-6 text-xs text-ink/70 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl">{CRISIS_NOTE}</p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/accessibility" className="hover:text-ink">
              Accessibility
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
