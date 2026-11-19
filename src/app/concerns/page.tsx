import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Safety concerns | Coach Me 2" };

export default async function ConcernsPage({ searchParams }: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error, notice } = await searchParams;
  const concerns = await prisma.safetyConcern.findMany({ orderBy: [{ resolvedAt: "asc" }, { createdAt: "desc" }], take: 200 });
  const clients = await prisma.client.findMany({
    where: { id: { in: concerns.map((c) => c.clientId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, firstName: true, lastName: true, publicId: true },
  });
  const nameOf = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName} (${c.publicId})`]));
  const when = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }).format(d);
  const open = concerns.filter((c) => !c.resolvedAt);

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Safeguarding</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Safety concerns</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        Reports from teens and parents. Read each one the day it comes in. Suspected abuse or neglect must be reported to
        Georgia DFCS within 24 hours (1-855-GACHILD); if someone is in immediate danger, call 911.
      </p>
      <Notice error={error} notice={notice} />
      <p className="mt-6 text-sm font-semibold">{open.length} open</p>
      <ul className="mt-3 grid gap-3">
        {concerns.length === 0 ? <li className="text-sm text-ink/60">No concerns reported.</li> : null}
        {concerns.map((c) => (
          <li key={c.id} className={`panel rounded-xl p-4 ${c.resolvedAt ? "opacity-60" : "border-signal/30"}`}>
            <p className="text-xs text-ink/55">
              {when(c.createdAt)} · from {c.reporterName} ({c.reporterRole === "client" ? "teen" : c.reporterRole === "guardian" ? "parent" : c.reporterRole})
              {c.clientId ? ` · about ${nameOf.get(c.clientId) ?? "a student"}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
            {c.resolvedAt ? (
              <p className="mt-2 text-xs text-ink/60">Handled {when(c.resolvedAt)}{c.note ? ` · ${c.note}` : ""}</p>
            ) : (
              <form action="/api/concerns" method="post" className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="intent" value="resolve" />
                <input type="hidden" name="id" value={c.id} />
                <label className="block min-w-60 flex-1 text-xs font-medium">
                  What was done
                  <input name="note" className="field mt-1 py-1.5 text-sm" placeholder="Called the family; reported to DFCS…" />
                </label>
                <button className="btn-secondary px-3 py-1.5 text-sm">Mark handled</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </Shell>
  );
}
