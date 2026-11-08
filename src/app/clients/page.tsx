import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, isStaff, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";
import { CASELOAD_LABELS, clientScope, getCaseload } from "@/lib/caseload";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; archived?: string; show?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (!isStaff(user)) redirect("/workspace");
  const { error, archived, show } = await searchParams;
  const showArchived = show === "archived";

  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;

  const caseload = await getCaseload(user);
  const clients = await prisma.client.findMany({
    where: {
      archivedAt: showArchived ? { not: null } : null,
      ...(await clientScope(user, coachId)),
    },
    include: {
      household: { include: { guardians: true, creditWallet: true } },
      consents: true,
      goals: { where: { status: "active" } },
      assignments: {
        where: { status: "active" },
        include: { coach: true, sessionAllowance: true },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Clients</h1>
          <p className="mt-3 text-ink/70">
            {user.role === "coach"
              ? `Showing: ${CASELOAD_LABELS[caseload]}. Switch caseloads in the sidebar.`
              : "Coach Me 2 program clients with unique IDs for forms and sheets. Coaches' own private clients never appear here."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={showArchived ? "/clients" : "/clients?show=archived"}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm"
          >
            {showArchived ? "Active clients" : "Archived"}
          </Link>
          {user.role === "coach" ? (
            <Link href="/clients/private/new" className="rounded-full bg-moss px-4 py-2 text-sm text-paper">
              Add my own client
            </Link>
          ) : null}
          {isLeadOrAdmin(user) ? (
            <>
              <Link
                href="/clients/new"
                className="rounded-full border border-ink/15 px-4 py-2 text-sm"
              >
                Enroll client
              </Link>
              <Link href="/matching" className="rounded-full bg-moss px-4 py-2 text-sm text-paper">
                Match a coach
              </Link>
            </>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}
      {archived ? <p className="mt-4 text-sm text-moss">Client archived — history retained.</p> : null}
      <div className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper/80 text-ink/60">
            <tr>
              <th className="px-4 py-3 font-medium">Client ID</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Household</th>
              <th className="px-4 py-3 font-medium">Credits</th>
              <th className="px-4 py-3 font-medium">Coach</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-ink/60">
                  No clients in view yet.
                </td>
              </tr>
            ) : null}
            {clients.map((client) => {
              const assignment = client.assignments[0];
              return (
                <tr key={client.id} className="border-t border-ink/10">
                  <td className="px-4 py-3 font-mono text-xs">{client.publicId}</td>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="text-moss underline">
                      {client.firstName} {client.lastName}
                    </Link>
                    {client.program === "private" ? (
                      <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
                        My client
                      </span>
                    ) : null}
                    <p className="text-xs text-ink/50">
                      {client.goals.length} active goal{client.goals.length === 1 ? "" : "s"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{client.household.name}</td>
                  <td className="px-4 py-3">
                    {client.household.creditWallet?.balance ?? 0}
                  </td>
                  <td className="px-4 py-3">{assignment?.coach.name ?? "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/chat?q=${client.lastName}`} className="underline">
                        Chat
                      </Link>
                      <Link href={`/calendar`} className="underline">
                        Book
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
