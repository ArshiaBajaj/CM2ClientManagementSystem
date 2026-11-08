import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { NavLink } from "@/components/nav-link";
import type { SessionUser } from "@/lib/auth";
import { isLeadOrAdmin, isStaff } from "@/lib/access";
import { coachGate, internRecord, internClearance, lockDestination } from "@/lib/gate";
import { getProgramSettings } from "@/lib/settings";

type NavItem = { href: string; label: string };

const STAFF_LINKS: NavItem[] = [
  { href: "/workspace", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/clients", label: "Clients" },
  { href: "/calendar", label: "Calendar" },
  { href: "/journal", label: "Journal" },
  { href: "/goals", label: "Goals" },
  { href: "/forms", label: "Forms" },
  { href: "/metrics", label: "Metrics" },
];

const MANAGER_LINKS: NavItem[] = [
  { href: "/matching", label: "Matching" },
  { href: "/clients/new", label: "Enroll" },
  { href: "/credits", label: "Credits" },
  { href: "/documents", label: "Documents" },
  { href: "/interns", label: "Interns" },
  { href: "/updates", label: "Website updates" },
  { href: "/settings", label: "Settings" },
];

const CLIENT_LINKS: NavItem[] = [
  { href: "/workspace", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/calendar", label: "Appointments" },
  { href: "/journal", label: "Journal" },
  { href: "/goals", label: "Goals" },
  { href: "/forms", label: "Forms" },
  { href: "/metrics", label: "My progress" },
];

const CLIENT_GROWTH_LINKS: NavItem[] = [
  { href: "/values", label: "Values inventory" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/documents", label: "Documents" },
];

const GUARDIAN_LINKS: NavItem[] = [
  { href: "/workspace", label: "Family home" },
  { href: "/calendar", label: "Appointments" },
  { href: "/documents", label: "Documents" },
  { href: "/credits", label: "Credits" },
];

const INTERN_LINKS: NavItem[] = [
  { href: "/intern", label: "Home" },
  { href: "/intern/tasks", label: "Tasks" },
  { href: "/intern/chat", label: "Team chat" },
  { href: "/intern/documents", label: "Documents" },
];

function Group({ title, items }: { title?: string; items: NavItem[] }) {
  return (
    <div className="flex gap-1 lg:flex-col">
      {title ? (
        <p className="hidden px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/40 lg:block">
          {title}
        </p>
      ) : null}
      {items.map((item) => (
        <NavLink key={item.href} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export function Notice({ error, notice }: { error?: string | null; notice?: string | null }) {
  return (
    <>
      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-deep">
          {notice}
        </p>
      ) : null}
    </>
  );
}

export async function Shell({
  user,
  children,
  passwordGate = true,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
  passwordGate?: boolean;
}) {
  if (passwordGate && user?.mustChangePassword) redirect("/account/password?first=1");

  const path = (await headers()).get("x-pathname") ?? "";
  if (user && path) {
    const dest = await lockDestination(user, path);
    if (dest) redirect(dest);
  }

  const coachState = user?.role === "coach" ? await coachGate(user) : null;
  const intern = user?.role === "intern" ? await internRecord(user) : null;
  const internReady = intern ? (await internClearance(intern.id)).ready : false;
  const product =
    user?.role === "intern" || user?.role === "intern_parent"
      ? "Intern workspace"
      : user?.role === "client"
        ? "Teen workspace"
        : "Client workspace";
  const homeHref =
    user?.role === "intern"
      ? internReady
        ? "/intern"
        : "/intern/start"
      : user?.role === "intern_parent"
        ? "/intern/start"
        : coachState === "forms"
          ? "/onboarding"
          : user
            ? "/workspace"
            : "/";

  const settings = await getProgramSettings();
  const programLinks = [
    { href: settings.websiteUrl, label: "CoachMe2.world" },
    { href: settings.podcastUrl, label: "Podcast" },
    { href: settings.researchUrl, label: "Research" },
  ].filter((link) => link.href);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="bg-[#1a3350] text-paper lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="px-5 py-5">
          <Link href={homeHref}>
            <Wordmark product={product} tone="dark" />
          </Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 text-sm lg:flex-1 lg:flex-col lg:overflow-y-auto">
          {!user ? <Group items={[{ href: "/login", label: "Sign in" }]} /> : null}
          {user && isStaff(user) && coachState === "ready" ? <Group items={STAFF_LINKS} /> : null}
          {user && isStaff(user) && coachState === null ? <Group items={STAFF_LINKS} /> : null}
          {coachState === "forms" ? <Group items={[{ href: "/onboarding", label: "Your forms" }]} /> : null}
          {coachState === "inactive" ? <Group items={[{ href: "/workspace", label: "Home" }]} /> : null}
          {user && isLeadOrAdmin(user) ? <Group title="Manage" items={MANAGER_LINKS} /> : null}
          {user?.role === "client" ? (
            <>
              <Group items={CLIENT_LINKS} />
              <Group title="Grow" items={CLIENT_GROWTH_LINKS} />
            </>
          ) : null}
          {user?.role === "guardian" ? <Group items={GUARDIAN_LINKS} /> : null}
          {user?.role === "intern" && internReady ? <Group items={INTERN_LINKS} /> : null}
          {user?.role === "intern" && !internReady ? (
            <Group items={[{ href: "/intern/start", label: "Your forms" }]} />
          ) : null}
          {user?.role === "intern_parent" ? (
            <Group items={[{ href: "/intern/start", label: "Forms to sign" }]} />
          ) : null}

          {programLinks.length > 0 ? (
            <div className="flex gap-1 lg:mt-auto lg:flex-col lg:pt-6">
              <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/40 lg:block">
                CoachMe2.world
              </p>
              {programLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap rounded-lg px-3 py-2 text-paper/70 hover:bg-white/10 hover:text-white"
                >
                  {link.label} ↗
                </a>
              ))}
            </div>
          ) : null}

          {user ? (
            <div className={`flex gap-1 border-white/10 lg:flex-col lg:border-t lg:pt-3 ${programLinks.length ? "lg:mt-3" : "lg:mt-auto"}`}>
              <NavLink href="/account/password">Change password</NavLink>
              <form action="/api/auth/logout" method="post">
                <button className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-paper/70 hover:bg-white/10 hover:text-white">
                  Sign out · {user.name.split(" ")[0]}
                </button>
              </form>
            </div>
          ) : null}
        </nav>
      </aside>
      <main className="page-enter mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
