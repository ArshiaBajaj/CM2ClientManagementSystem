import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Shell } from "@/components/shell";
import { prisma } from "@/lib/db";

export default async function PasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; first?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { mustChangePassword: true } });
  const required = Boolean(account?.mustChangePassword);

  return (
    <Shell user={user} passwordGate={false}>
      <div className="mx-auto max-w-md">
        <p className="label-caps text-accent">Account</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          {required ? "Set your password" : "Change password"}
        </h1>
        <p className="mt-3 text-ink/60">
          {required
            ? "Welcome to Coach Me 2. Choose your own password (at least 8 characters) to finish signing in."
            : "Use at least 8 characters."}
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">
            {error}
          </p>
        ) : null}
        <form action="/api/account/password" method="post" className="panel mt-8 space-y-4 rounded-xl p-6">
          {required ? null : (
            <label className="block text-sm font-medium">
              Current password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="field"
              />
            </label>
          )}
          <label className="block text-sm font-medium">
            New password
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </label>
          <button className="btn w-full">Save password</button>
        </form>
      </div>
    </Shell>
  );
}
