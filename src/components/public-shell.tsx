import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { getProgramSettings } from "@/lib/settings";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  const settings = await getProgramSettings();
  const links = [
    { href: settings.websiteUrl, label: "Website" },
    { href: settings.podcastUrl, label: "Podcast" },
    { href: settings.researchUrl, label: "Research" },
  ].filter((l) => l.href);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/[0.08] bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="shrink-0">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="btn-ghost whitespace-nowrap">
                {link.label}
              </a>
            ))}
            <Link href="/get-a-coach" className="btn-ghost whitespace-nowrap">
              Get a coach
            </Link>
            <Link href="/login" className="btn ml-1 whitespace-nowrap px-4">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="page-enter">{children}</main>
    </div>
  );
}
