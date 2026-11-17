import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { NotificationSetup } from "@/components/notification-setup";

const WHAT_YOU_GET: Record<string, string[]> = {
  client: ["New messages from your coach", "A reminder on days you have a session", "An evening nudge if today's goals are still open"],
  guardian: ["Session reminders for your teen", "New documents to sign"],
  coach: ["New messages from your students", "Your sessions for the day, each morning", "New bookings"],
  intern: ["New messages in your team chat and direct messages", "A morning heads-up on anything you committed to that's due", "Nudges from teammates"],
  team_lead: ["New coach requests and website messages, each morning"],
  admin: ["New coach requests and website messages, each morning"],
};

/** Notifications (phone + Apple Watch) and the private calendar feed. */
export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { notice } = await searchParams;
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { calendarToken: true, emailNotifications: true, email: true },
  });
  const host = (await headers()).get("host") ?? "";
  const feedPath = record?.calendarToken ? `${host}/api/calendar/${record.calendarToken}.ics` : null;
  const showCalendar = user.role !== "intern_parent";

  return (
    <Shell user={user} passwordGate={false}>
      <p className="label-caps text-accent">Your account</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Phone &amp; Apple Watch</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        Get Coach Me 2 reminders on your phone. On iPhone they also show on your Apple Watch, the same way your
        messages do. Notifications only say who and when, never what was written, because they show on lock screens.
      </p>
      <Notice notice={notice === "calendar" ? "Your calendar link is ready." : null} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="panel rounded-2xl p-6">
          <p className="text-2xl" aria-hidden>
            ⌚
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">Notifications</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink/65">
            {(WHAT_YOU_GET[user.role] ?? ["Updates from Coach Me 2"]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-5">
            <NotificationSetup />
          </div>
          <p className="mt-5 text-xs text-ink/50">
            Turn this on separately on each phone or computer you use. On iPhone, add Coach Me 2 to your Home Screen first.
          </p>
          <form action="/api/account/alerts" method="post" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
            <p className="text-sm text-ink/70">
              Email reminders to <span className="font-medium text-ink">{record?.email}</span>:{" "}
              <span className="font-semibold">{record?.emailNotifications ? "on" : "off"}</span>
            </p>
            <input type="hidden" name="email" value={record?.emailNotifications ? "off" : "on"} />
            <button className="btn-secondary px-3 py-1.5 text-sm">{record?.emailNotifications ? "Turn off" : "Turn on"}</button>
          </form>
        </section>

        {showCalendar ? (
          <section className="panel rounded-2xl p-6">
            <p className="text-2xl" aria-hidden>
              📅
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">
              {user.role === "intern" ? "Commitments in your calendar" : "Sessions in your calendar"}
            </h2>
            <p className="mt-2 text-sm text-ink/65">
              {user.role === "intern"
                ? "Subscribe once and everything you've committed to shows in Google Calendar or Apple Calendar on its due date, with a reminder. It updates itself."
                : "Subscribe once and every session shows in Google Calendar, Apple Calendar (and on your Apple Watch), or Outlook, with an alert 15 minutes before. It updates itself when sessions change."}
            </p>
            {feedPath ? (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(`webcal://${feedPath}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn"
                  >
                    Add to Google Calendar
                  </a>
                  <a href={`webcal://${feedPath}`} className="btn-secondary">
                    Add to Apple Calendar
                  </a>
                </div>
                <label className="block text-sm font-medium">
                  Or copy this link into Google Calendar (Other calendars → From URL)
                  <input readOnly value={`https://${feedPath}`} className="field font-mono text-xs" />
                </label>
                <form action="/api/calendar" method="post">
                  <input type="hidden" name="intent" value="reset" />
                  <button className="btn-ghost px-0 text-xs">Reset link (stops the old one working)</button>
                </form>
              </div>
            ) : (
              <form action="/api/calendar" method="post" className="mt-5">
                <button className="btn">Create my calendar link</button>
              </form>
            )}
            <p className="mt-4 text-xs text-ink/50">Keep this link private: anyone with it can see your session times.</p>
          </section>
        ) : null}
      </div>
    </Shell>
  );
}
