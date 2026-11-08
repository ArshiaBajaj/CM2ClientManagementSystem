import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, resolveCoachId } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { FOCUS_AREAS, WEEKDAYS, minutesToLabel, splitList } from "@/lib/matching";
import { TIMEZONES } from "@/lib/timezones";

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ coachId?: string; error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const manager = isLeadOrAdmin(user);
  if (!manager && user.role !== "coach") redirect("/workspace");

  const { coachId: requested, error, notice } = await searchParams;
  const coaches = manager
    ? await prisma.coachRoster.findMany({ where: { status: "active" }, orderBy: { name: "asc" } })
    : [];
  const coachId = manager ? (requested ?? coaches[0]?.coachId) : await resolveCoachId(user);

  const coach = coachId
    ? await prisma.coachRoster.findUnique({
        where: { coachId },
        include: { availability: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] } },
      })
    : null;

  const focus = new Set(splitList(coach?.focusAreas ?? ""));

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href="/calendar" className="link-accent">
          ← Calendar
        </Link>
      </p>
      <p className="label-caps mt-4 text-accent">Scheduling</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {manager ? "Coach availability" : "My availability"}
      </h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        Students can only book inside these hours. Managers see them on the team calendar, and
        matching uses them with your focus areas to suggest coaches.
      </p>
      <Notice error={error} notice={notice} />

      {manager ? (
        <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
          <label className="block text-sm font-medium">
            Coach
            <select name="coachId" defaultValue={coachId ?? ""} className="field min-w-64">
              {coaches.map((c) => (
                <option key={c.coachId} value={c.coachId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-secondary">Show</button>
        </form>
      ) : null}

      {!coach ? (
        <p className="panel mt-8 rounded-xl p-6 text-ink/60">No coach profile found.</p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="panel rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">Weekly hours</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-7">
              {WEEKDAYS.map((day, index) => {
                const slots = coach.availability.filter((s) => s.weekday === index);
                return (
                  <div key={day} className="rounded-lg border border-ink/[0.08] bg-paper/60 p-2">
                    <p className="text-xs font-semibold text-ink/60">{day}</p>
                    <div className="mt-2 space-y-1.5">
                      {slots.length === 0 ? <p className="text-xs text-ink/30">Off</p> : null}
                      {slots.map((slot) => (
                        <form key={slot.id} action="/api/availability" method="post" className="group">
                          <input type="hidden" name="intent" value="remove_slot" />
                          <input type="hidden" name="coachId" value={coach.coachId} />
                          <input type="hidden" name="slotId" value={slot.id} />
                          <button
                            title="Remove"
                            className="w-full rounded bg-emerald-50 px-1.5 py-1 text-left text-xs text-emerald-800 hover:bg-signal/10 hover:text-signal"
                          >
                            {minutesToLabel(slot.startMinute)}–{minutesToLabel(slot.endMinute)}
                            <span className="hidden group-hover:inline"> ✕</span>
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <form action="/api/availability" method="post" className="mt-6 border-t border-ink/[0.08] pt-5">
              <input type="hidden" name="intent" value="add_slot" />
              <input type="hidden" name="coachId" value={coach.coachId} />
              <p className="text-sm font-medium">Add hours</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((day, index) => (
                  <label
                    key={day}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                  >
                    <input type="checkbox" name="weekday" value={index} defaultChecked={index >= 1 && index <= 5} />
                    {day}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block text-sm font-medium">
                  From
                  <input type="time" name="start" defaultValue="15:30" step={900} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  To
                  <input type="time" name="end" defaultValue="19:00" step={900} className="field" />
                </label>
                <button className="btn">Add</button>
              </div>
            </form>
          </section>

          <form action="/api/availability" method="post" className="panel h-fit space-y-4 rounded-xl p-6">
            <input type="hidden" name="intent" value="profile" />
            <input type="hidden" name="coachId" value={coach.coachId} />
            <h2 className="font-display text-xl font-semibold tracking-tight">Coaching profile</h2>
            <fieldset>
              <legend className="text-sm font-medium">Focus areas</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => (
                  <label
                    key={area}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/10"
                  >
                    <input type="checkbox" name="focusAreas" value={area} defaultChecked={focus.has(area)} />
                    {area}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              Maximum students
              <input type="number" name="capacity" min={1} max={40} defaultValue={coach.capacity} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Time zone
              <select name="timezone" defaultValue={coach.timezone} className="field">
                {TIMEZONES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn w-full">Save profile</button>
          </form>
        </div>
      )}
    </Shell>
  );
}
