import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { openSecret, totpUri } from "@/lib/totp";
import { isLeadOrAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Two-step sign-in | Coach Me 2" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) redirect("/login");
  const { error, notice } = await searchParams;
  const settingUp = Boolean(user.totpSecret && !user.totpEnabledAt);
  const secret = settingUp ? openSecret(user.totpSecret!) : "";
  const qr = settingUp ? await QRCode.toDataURL(totpUri(secret, user.email), { margin: 1, width: 220 }) : "";

  return (
    <Shell user={session}>
      <p className="label-caps text-accent">Account</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Two-step sign-in</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        After your password or Google sign-in, the portal also asks for a 6-digit code from an authenticator app on your
        phone, so a stolen password alone can&apos;t get in.
        {isLeadOrAdmin(session) ? " Managers can see every family's information, so please turn this on." : ""}
      </p>
      <Notice error={error} notice={notice} />

      <section className="panel mt-8 max-w-2xl rounded-xl p-6">
        {user.totpEnabledAt ? (
          <>
            <p className="font-medium">✅ Two-step sign-in is on</p>
            <p className="mt-1 text-sm text-ink/60">
              Lost your phone? Another admin can turn it off for you under Settings → Sign-in help.
            </p>
            <form action="/api/account/two-step" method="post" className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="intent" value="disable" />
              <label className="block text-sm font-medium">
                Current code
                <input name="code" inputMode="numeric" autoComplete="one-time-code" required className="field w-40" />
              </label>
              <button className="btn-ghost">Turn off</button>
            </form>
          </>
        ) : settingUp ? (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>
                Install an authenticator app on your phone, such as <b>Google Authenticator</b> or <b>Microsoft Authenticator</b>.
              </li>
              <li>In the app, tap <b>+</b> and scan this code.</li>
            </ol>
            <img src={qr} alt="QR code to add Coach Me 2 to your authenticator app" width={220} height={220} className="mt-4 rounded-lg border border-ink/10" />
            <p className="mt-3 text-xs text-ink/60">
              Can&apos;t scan? Enter this key instead: <span className="select-all font-mono text-ink">{secret.match(/.{1,4}/g)?.join(" ")}</span>
            </p>
            <form action="/api/account/two-step" method="post" className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="intent" value="confirm" />
              <label className="block text-sm font-medium">
                3. Type the 6-digit code from the app
                <input name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="field w-40" />
              </label>
              <button className="btn">Turn on</button>
            </form>
          </>
        ) : (
          <form action="/api/account/two-step" method="post">
            <input type="hidden" name="intent" value="start" />
            <p className="text-sm text-ink/70">Takes about a minute. You&apos;ll need your phone.</p>
            <button className="btn mt-4">Set up two-step sign-in</button>
          </form>
        )}
      </section>
    </Shell>
  );
}
