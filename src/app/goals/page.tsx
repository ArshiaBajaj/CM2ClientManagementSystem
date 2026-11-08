import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, isStaff, resolveCoachId } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Shell } from "@/components/shell";

export default async function GoalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "guardian") {
    redirect("/workspace?error=Student%20goals%20are%20confidential");
  }

  const { error } = await searchParams;
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;
  const today = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();

  const clients =
    user.role === "client" && user.clientId
      ? await prisma.client.findMany({ where: { id: user.clientId } })
      : user.role === "coach" && coachId
        ? await prisma.client.findMany({
            where: {
              archivedAt: null,
              assignments: { some: { coachId, status: "active" } },
            },
          })
        : isLeadOrAdmin(user)
          ? await prisma.client.findMany({ where: { archivedAt: null } })
          : [];

  const goals = await prisma.goal.findMany({
    where: {
      clientId: { in: clients.map((c) => c.id) },
      status: "active",
    },
    include: {
      client: true,
      checkIns: { where: { day: { gte: new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10) } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Shell user={user}>
      <h1 className="font-display text-4xl">Goals</h1>
      <p className="mt-2 text-ink/70">
        Interactive daily goals with end-of-day reminders and check-in charts.
      </p>
      {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

      <div className="mt-8 space-y-4">
        {goals.length === 0 ? <p className="text-ink/60">No active goals.</p> : null}
        {goals.map((goal) => {
          const todayCheck = goal.checkIns.find((c) => c.day === today);
          const dueNow = goal.interactive && hour >= goal.remindAtHour && !todayCheck?.completed;
          const last14 = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
            const hit = goal.checkIns.find((c) => c.day === d)?.completed;
            return { d, hit: Boolean(hit) };
          });
          const rate = Math.round((last14.filter((x) => x.hit).length / 14) * 100);

          return (
            <article key={goal.id} className="rounded-2xl border border-ink/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{goal.title}</h2>
                  <p className="text-sm text-ink/60">
                    {goal.client.firstName} {goal.client.lastName} · {goal.cadence} · remind ~{" "}
                    {goal.remindAtHour}:00
                  </p>
                </div>
                {dueNow ? (
                  <p className="rounded-full bg-clay/15 px-3 py-1 text-sm text-clay">
                    Reminder: check in for today
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                {last14.map((day) => (
                  <div
                    key={day.d}
                    title={day.d}
                    className={`h-8 w-4 rounded-sm ${day.hit ? "bg-moss" : "bg-ink/10"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-ink/60">{rate}% completion over 14 days</p>

              <form action="/api/goals/checkin" method="post" className="mt-4 flex flex-wrap gap-3">
                <input type="hidden" name="goalId" value={goal.id} />
                <input type="hidden" name="day" value={today} />
                <input type="hidden" name="completed" value="1" />
                <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">
                  {todayCheck?.completed ? "Checked in ✓" : "I did it today"}
                </button>
              </form>
            </article>
          );
        })}
      </div>

      {isStaff(user) && clients[0] ? (
        <section className="mt-10 rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-display text-2xl">Add interactive goal</h2>
          <form action="/api/goals" method="post" className="mt-4 grid max-w-xl gap-3">
            <label className="block text-sm">
              Client
              <select
                name="clientId"
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                defaultValue={clients[0].id}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Goal
              <input
                name="title"
                required
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
                placeholder="Prep for SAT every day"
              />
            </label>
            <label className="block text-sm">
              Cadence
              <select
                name="cadence"
                defaultValue="daily"
                className="mt-2 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <button className="rounded-full bg-moss px-4 py-2 text-sm text-paper">Create goal</button>
          </form>
        </section>
      ) : null}
    </Shell>
  );
}
