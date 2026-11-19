import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/public-shell";
import { PENDING_COOKIE, readPendingSignIn } from "@/lib/sign-in";

export const dynamic = "force-dynamic";
export const metadata = { title: "Two-step sign-in | Coach Me 2" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const pending = await readPendingSignIn((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending) redirect("/login");
  const { error } = await searchParams;
  return (
    <PublicShell>
      <div className="mx-auto max-w-md px-6 py-16">
        <p className="label-caps text-accent">Two-step sign-in</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Enter your code</h1>
        <p className="mt-3 text-ink/65">Open your authenticator app and type the 6-digit code for Coach Me 2.</p>
        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-signal/10 px-3 py-2 text-sm text-signal">
            {error}
          </p>
        ) : null}
        <form action="/api/auth/verify" method="post" className="panel mt-8 space-y-4 rounded-xl p-6">
          <label className="block text-sm font-medium">
            6-digit code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              required
              autoFocus
              className="field text-center font-mono text-2xl tracking-[0.4em]"
            />
          </label>
          <button className="btn w-full py-3">Continue</button>
        </form>
      </div>
    </PublicShell>
  );
}
