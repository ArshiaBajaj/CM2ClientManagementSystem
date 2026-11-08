import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";
import { ensureWallet } from "@/lib/credits";
import { getProgramSettings } from "@/lib/settings";

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ householdId?: string; error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { householdId: qsHousehold, error } = await searchParams;
  const settings = await getProgramSettings();

  let householdId =
    user.role === "guardian" ? await getGuardianHouseholdId(user) : qsHousehold ?? null;

  // Coaches' private clients keep their own households; managers only see Coach Me 2 families.
  const cm2Household = { clients: { some: { program: "cm2" } } };
  if (isLeadOrAdmin(user) && householdId) {
    const visible = await prisma.household.findFirst({ where: { id: householdId, ...cm2Household } });
    if (!visible) householdId = null;
  }
  if (isLeadOrAdmin(user) && !householdId) {
    const first = await prisma.household.findFirst({ where: cm2Household, orderBy: { createdAt: "asc" } });
    householdId = first?.id ?? null;
  }

  if (!householdId) redirect("/workspace");

  const household = await prisma.household.findUnique({
    where: { id: householdId },
    include: { clients: true, guardians: true },
  });
  if (!household) redirect("/workspace");

  const wallet = await ensureWallet(householdId);
  const ledger = await prisma.creditLedger.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const households = isLeadOrAdmin(user)
    ? await prisma.household.findMany({ where: cm2Household, orderBy: { name: "asc" } })
    : [];

  return (
    <Shell user={user}>
      <h1 className="font-display text-4xl">Session credits</h1>
      <p className="mt-2 text-ink/70">
        Parents purchase packs (e.g. 6 sessions). Booking spends a credit when the system is on.
        Cancel ≥{settings.cancelRefundHours}h ahead to get it back.
      </p>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {!settings.creditsEnabled ? (
        <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">Credits are currently turned off in Settings.</p>
      ) : null}

      {isLeadOrAdmin(user) ? (
        <form className="mt-6">
          <label className="block max-w-md text-sm">
            Household
            <select
              name="householdId"
              defaultValue={householdId}
              className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-3 rounded-full border border-ink/15 px-4 py-2 text-sm">View</button>
        </form>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/45">{household.name}</p>
          <p className="mt-2 font-display text-5xl">{wallet.balance}</p>
          <p className="text-sm text-ink/60">credits available</p>
          <form action="/api/credits" method="post" className="mt-5 space-y-3">
            <input type="hidden" name="householdId" value={householdId} />
            <label className="block text-sm">
              Purchase pack
              <select
                name="pack"
                defaultValue={6}
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
              >
                <option value={6}>6 sessions</option>
                <option value={12}>12 sessions</option>
                <option value={24}>24 sessions</option>
              </select>
            </label>
            <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">
              Add credits
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-2xl">Ledger</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {ledger.map((row) => (
              <li key={row.id} className="rounded-xl bg-paper/80 px-3 py-2">
                <span className={row.delta >= 0 ? "text-moss" : "text-clay"}>
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta}
                </span>{" "}
                {row.reason} · {row.createdAt.toLocaleString()}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </Shell>
  );
}
