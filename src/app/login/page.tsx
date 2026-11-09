import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeFor } from "@/lib/gate";
import { PublicShell } from "@/components/public-shell";
import { prisma } from "@/lib/db";
import { googleEnabled } from "@/lib/google";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect(await homeFor(user));
  const { error } = await searchParams;
  // Demo hints (pre-filled manager login, list of preview accounts) only show when DEMO_LOGINS=on.
  // Keep it off once real families use the site.
  // They also disappear once the preview accounts are cleared out with "Start fresh".
  const demo =
    process.env.DEMO_LOGINS === "on" && Boolean(await prisma.user.findUnique({ where: { email: "lead@coachme2.org" } }));
  const google = googleEnabled();

  return (
    <PublicShell>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="stagger">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Sign in to Coach Me 2
          </h1>
          <p className="mt-4 max-w-md text-ink/65">
            Use the email your program manager added for you. The portal takes you straight to your own space.
          </p>
          <ul className="mt-6 max-w-md space-y-3 text-sm text-ink/70">
            <li><span className="font-medium text-ink">Managers</span> see every student, coach, and intern.</li>
            <li><span className="font-medium text-ink">Coaches</span> see their students and sessions.</li>
            <li><span className="font-medium text-ink">Interns</span> get tasks, team chat, and shared documents.</li>
            <li><span className="font-medium text-ink">Teens and families</span> see sessions, goals, and their coach.</li>
          </ul>
        </div>

        <div className="panel rounded-2xl p-7 shadow-soft">
          {error ? (
            <p className="mb-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">{error}</p>
          ) : null}
          {google ? (
            <>
              <a href="/api/auth/google" className="btn flex w-full items-center justify-center gap-3 py-3">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 rounded-full bg-white p-0.5">
                  <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8Z" />
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
                  <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
                  <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
                </svg>
                Sign in with Google
              </a>
              <p className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/50">
                <span className="h-px flex-1 bg-ink/10" />
                or use a password
                <span className="h-px flex-1 bg-ink/10" />
              </p>
            </>
          ) : null}
          <form action="/api/auth/login" method="post" className="space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                className="field bg-white"
                autoComplete="email"
                defaultValue={demo ? "lead@coachme2.org" : undefined}
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                className="field bg-white"
                autoComplete="current-password"
                defaultValue={demo ? "demo1234" : undefined}
              />
            </label>
            {demo ? (
              <p className="text-sm text-ink/55">The manager preview is filled in. Password for every preview account is demo1234.</p>
            ) : null}
            <button className={google ? "btn-ghost w-full py-3" : "btn w-full py-3"}>Sign in with password</button>
          </form>
          {demo ? (
          <div className="mt-6 border-t border-ink/10 pt-4 text-sm">
            <p className="font-medium">Other preview accounts</p>
            <ul className="mt-2 space-y-1.5 text-ink/70">
              <li>Coach, forms still open · pending.coach@example.com</li>
              <li>Coach, students open · coach@example.com</li>
              <li>Intern, team open · maya.chen@example.com</li>
              <li>Intern, waiting on a parent · leo.park@example.com</li>
              <li>Parent, still signing · sam.park@example.com</li>
              <li>Student · teen@example.com · Family · guardian@example.com</li>
            </ul>
          </div>
          ) : (
            <p className="mt-6 border-t border-ink/10 pt-4 text-sm text-ink/60">
              New here?{" "}
              <a href="/get-a-coach" className="link-accent">
                Request a coach
              </a>{" "}
              first. Forgot your password? Your program manager can give you a new one.
            </p>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
