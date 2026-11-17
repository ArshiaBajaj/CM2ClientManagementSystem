import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { prisma } from "@/lib/db";
import { hashInvite } from "@/lib/invite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome | Coach Me 2", robots: { index: false } };

/** Where the link in a welcome email lands: the person chooses their own password and is signed in. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t = "", error } = await searchParams;
  const user = t
    ? await prisma.user.findUnique({ where: { inviteTokenHash: hashInvite(t) }, select: { name: true, email: true, inviteExpiresAt: true } })
    : null;
  const valid = Boolean(user && user.inviteExpiresAt && user.inviteExpiresAt.getTime() > Date.now());

  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-16">
        <p className="label-caps text-accent">Welcome</p>
        {valid && user ? (
          <>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Hi {user.name.split(/\s+/)[0]}!</h1>
            <p className="mt-3 text-ink/65">
              Choose a password for <span className="font-medium text-ink">{user.email}</span>. You&apos;ll use it to sign in
              from now on.
            </p>
            {error ? (
              <p role="alert" className="mt-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">
                {error}
              </p>
            ) : null}
            <form action="/api/auth/welcome" method="post" className="panel mt-8 space-y-4 rounded-xl p-6">
              <input type="hidden" name="t" value={t} />
              <input type="email" name="username" value={user.email} autoComplete="username" readOnly hidden />
              <label className="block text-sm font-medium">
                New password
                <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="field" />
              </label>
              <label className="block text-sm font-medium">
                Type it again
                <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="field" />
              </label>
              <button className="btn w-full py-3">Save and sign in</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">This link has expired</h1>
            <p className="mt-3 text-ink/65">
              Welcome links work once and last 14 days. Ask your program manager to send a new one, or{" "}
              <Link href="/login" className="font-medium text-accent underline">
                sign in
              </Link>{" "}
              if you&apos;ve already set your password.
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}
