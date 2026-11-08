import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { getPermissions, getProgramSettings } from "@/lib/settings";
import { parseFields } from "@/lib/forms";

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (!isStaff(user)) redirect("/calendar");
  const { id } = await params;
  const { error, notice } = await searchParams;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      client: true,
      coach: true,
      appointmentType: true,
      aiNote: true,
      emailLogs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!appointment) notFound();
  const access = await canAccessClient(user, appointment.clientId);
  if (!access.ok) redirect("/calendar?error=That%20session%20is%20not%20with%20your%20student");

  const [settings, permissions] = await Promise.all([getProgramSettings(), getPermissions()]);
  const scribeForm = appointment.appointmentType?.scribeFormKey
    ? await prisma.formTemplate.findUnique({ where: { key: appointment.appointmentType.scribeFormKey } })
    : null;
  const sections = scribeForm ? parseFields(scribeForm.schemaJson) : [];
  const scribeOn = permissions.aiScribeEnabled && appointment.aiScribeEnabled && !appointment.client.aiScribeOptOut;
  const note = appointment.aiNote;
  const engine = note?.status.startsWith("generated:") ? note.status.split(":")[1] : null;
  const hasNotes = Boolean(note?.editedNotes || note?.generatedNotes);
  const returnTo = `/calendar/${appointment.id}`;

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href={`/clients/${appointment.clientId}`} className="link-accent">
          ← {appointment.client.firstName}&apos;s profile
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">{appointment.appointmentType?.name ?? "Session"}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {appointment.client.firstName} {appointment.client.lastName}
          </h1>
          <p className="mt-1 text-ink/60">
            {appointment.startsAt.toLocaleString([], { dateStyle: "full", timeStyle: "short" })} · {appointment.coach.name} ·{" "}
            {appointment.status.replace("_", "-")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {appointment.meetingUrl && appointment.status === "scheduled" ? (
            <a href={appointment.meetingUrl} target="_blank" rel="noreferrer" className="btn">
              Join video
            </a>
          ) : null}
          {appointment.status === "scheduled" ? (
            <form action="/api/appointments" method="post">
              <input type="hidden" name="intent" value="complete" />
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className="btn-secondary">Mark complete</button>
            </form>
          ) : null}
        </div>
      </div>
      <Notice error={error} notice={notice} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="panel rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Session notes</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                scribeOn ? "bg-accent/10 text-accent-deep" : "bg-ink/[0.06] text-ink/60"
              }`}
            >
              {scribeOn ? "AI scribe on" : "AI scribe off"}
            </span>
          </div>
          {settings.notesTakenNotice ? (
            <p className="mt-2 text-sm text-ink/55">
              Notes are expected for every session. Managers can read them; parents never can.
            </p>
          ) : null}

          {scribeOn ? (
            <form action="/api/ai-notes" method="post" className="mt-5 space-y-3">
              <input type="hidden" name="appointmentId" value={appointment.id} />
              <input type="hidden" name="intent" value="generate" />
              <label className="block text-sm font-medium">
                Transcript
                <textarea
                  name="transcript"
                  rows={hasNotes ? 4 : 10}
                  defaultValue={note?.transcript ?? ""}
                  className="field font-mono text-xs"
                  placeholder={"Coach: How did the week go?\nSam: I finished two SAT practice sections..."}
                />
              </label>
              <p className="text-xs text-ink/50">
                Paste the transcript from Zoom (Recording → Audio transcript). Put each speaker on a
                new line as “Name: what they said” so quotes are attributed correctly.
              </p>
              <button className="btn">{hasNotes ? "Regenerate draft" : "Draft notes with AI"}</button>
            </form>
          ) : (
            <p className="mt-4 rounded-md bg-ink/[0.04] p-3 text-sm text-ink/65">
              {appointment.client.aiScribeOptOut
                ? `${appointment.client.firstName} opted out of the AI scribe, so this session is not transcribed.`
                : "The AI scribe is turned off. Write your notes below."}
            </p>
          )}

          <form action="/api/ai-notes" method="post" className="mt-6 space-y-3 border-t border-ink/[0.08] pt-5">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <input type="hidden" name="intent" value="save_edit" />
            <label className="block text-sm font-medium">
              Coaching notes{" "}
              {engine ? (
                <span className="font-normal text-ink/45">
                  · drafted by {engine === "claude" ? "Claude" : "the local scribe"}, edit before saving
                </span>
              ) : null}
              <textarea
                name="editedNotes"
                rows={16}
                defaultValue={note?.editedNotes || note?.generatedNotes || sections.map((s) => `${s.label}\n• `).join("\n\n")}
                className="field text-sm leading-relaxed"
              />
            </label>
            <div className="flex items-center gap-3">
              <button className="btn">Save notes</button>
              {note?.status === "reviewed" ? <span className="text-xs text-emerald-700">Reviewed and saved</span> : null}
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="label-caps">Note form</h2>
            <p className="mt-2 font-medium">{scribeForm?.name ?? "Summary only"}</p>
            {sections.length ? (
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-ink/65">
                {sections.map((s) => (
                  <li key={s.id}>{s.label}</li>
                ))}
              </ol>
            ) : null}
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-ink/55">Scribe instructions</summary>
              <p className="mt-2 whitespace-pre-wrap text-xs text-ink/60">
                {appointment.appointmentType?.aiScribeInstructions || "None set."}
              </p>
            </details>
          </section>
          <section className="panel rounded-xl p-5 text-sm">
            <h2 className="label-caps">Details</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-ink/50">Client ID</dt>
                <dd className="font-mono">{appointment.client.publicId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">Video</dt>
                <dd>{appointment.appointmentType?.meetingProvider === "google_meet" ? "Google Meet" : "Zoom (HIPAA)"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">Credit used</dt>
                <dd>{appointment.creditConsumed ? "Yes" : "No"}</dd>
              </div>
            </dl>
            {appointment.emailLogs.length ? (
              <div className="mt-3 border-t border-ink/[0.08] pt-3">
                <p className="text-xs text-ink/50">Confirmation emails</p>
                {appointment.emailLogs.map((log) => (
                  <p key={log.id} className="mt-1 text-xs">
                    {log.toEmail} · {log.createdAt.toLocaleString()}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </Shell>
  );
}
