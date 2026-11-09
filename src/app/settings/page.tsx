import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { PERMISSIONS, getProgramSettings, parsePermissions } from "@/lib/settings";
import { RELEASE_ANCHORS, describeOffset } from "@/lib/releases";

const KIND_LABELS: Record<string, string> = {
  first: "First session",
  follow_up: "Follow-up session",
  final: "Final session",
  check_in: "Check-in",
};

function Toggle({ name, label, checked, hint }: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className="mt-1" />
      <span>
        {label}
        {hint ? <span className="block text-xs text-ink/50">{hint}</span> : null}
      </span>
    </label>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");

  const { notice, error } = await searchParams;
  const settings = await getProgramSettings();
  const permissions = parsePermissions(settings.rolePermissionsJson);
  const [types, templates, rules] = await Promise.all([
    prisma.appointmentType.findMany({ orderBy: { name: "asc" } }),
    prisma.formTemplate.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.formReleaseRule.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const scribeForms = templates.filter((t) => t.audience === "scribe");
  const clientForms = templates.filter((t) => t.audience !== "scribe");
  const templateName = (key: string) => templates.find((t) => t.key === key)?.name ?? key;

  const sections = [
    ["program", "Program"],
    ["access", "Access"],
    ["types", "Appointment types"],
    ["releases", "Automatic forms"],
    ["email", "Confirmation email"],
  ];

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Manager</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Settings</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-ink/15 bg-white px-3 py-1.5 hover:border-ink/30">
            {label}
          </a>
        ))}
      </nav>
      <Notice error={error} notice={notice} />

      <section id="program" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Program</h2>
        <form action="/api/settings" method="post" className="panel mt-4 grid gap-6 rounded-xl p-6 lg:grid-cols-2">
          <input type="hidden" name="intent" value="program" />
          <fieldset className="space-y-3">
            <legend className="mb-2 font-medium">Credits</legend>
            <Toggle name="creditsEnabled" label="Use session credits" checked={settings.creditsEnabled} hint="When on, booking a session uses one credit." />
            <label className="block text-sm font-medium">
              When someone cancels
              <select name="cancelPolicy" defaultValue={settings.cancelPolicy} className="field">
                <option value="window">Return the credit if they cancel early enough</option>
                <option value="always_refund">Always return the credit</option>
                <option value="never_refund">Never return the credit</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              How early (hours before the session)
              <input type="number" name="cancelRefundHours" min={1} max={168} defaultValue={settings.cancelRefundHours} className="field" />
            </label>
            <Toggle name="coachCanRestoreCredits" label="Coaches can restore a credit for extenuating circumstances" checked={settings.coachCanRestoreCredits} />
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 font-medium">Calendar and video</legend>
            <label className="block text-sm font-medium">
              Default video provider
              <select name="defaultMeetingProvider" defaultValue={settings.defaultMeetingProvider} className="field">
                <option value="zoom_hipaa">Zoom for Healthcare (HIPAA)</option>
                <option value="google_meet">Google Meet (Workspace BAA)</option>
              </select>
            </label>
            <Toggle name="managerSeesAllCalendars" label="Managers see every coach's calendar" checked={settings.managerSeesAllCalendars} />
            <Toggle name="googleCalendarLinked" label="Google Calendar sync" checked={settings.googleCalendarLinked} hint="Needs Google API credentials before it syncs." />
            <Toggle name="outlookCalendarLinked" label="Outlook Calendar sync" checked={settings.outlookCalendarLinked} hint="Needs Microsoft API credentials before it syncs." />
            <Toggle name="notesTakenNotice" label="Remind coaches that the AI scribe takes notes" checked={settings.notesTakenNotice} />
          </fieldset>
          <fieldset className="space-y-3 lg:col-span-2">
            <legend className="mb-2 font-medium">Website links</legend>
            <p className="text-sm text-ink/55">Shown in the sidebar and on the public home page.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                CoachMe2.world
                <input name="websiteUrl" defaultValue={settings.websiteUrl} placeholder="https://" className="field" />
              </label>
              <label className="block text-sm font-medium">
                Podcast
                <input name="podcastUrl" defaultValue={settings.podcastUrl} placeholder="https://" className="field" />
              </label>
              <label className="block text-sm font-medium">
                Research
                <input name="researchUrl" defaultValue={settings.researchUrl} placeholder="https://" className="field" />
              </label>
            </div>
          </fieldset>
          <div className="lg:col-span-2">
            <button className="btn">Save program settings</button>
          </div>
        </form>
      </section>

      <section id="team" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Team accounts</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">
          Create a login for a program manager or a coach. You&apos;ll see their temporary password once at the top of the
          page; they choose their own at first sign-in. Coaches still sign their coach forms before any students appear.
          Families and interns are added from Clients and Interns.
        </p>
        <form action="/api/settings" method="post" className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-[1fr_1fr_10rem_auto] sm:items-end">
          <input type="hidden" name="intent" value="team_account" />
          <label className="block text-sm font-medium">
            Full name
            <input name="name" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input type="email" name="email" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Role
            <select name="role" className="field" defaultValue="coach">
              <option value="coach">Coach</option>
              <option value="team_lead">Program manager</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="btn">Create account</button>
        </form>
      </section>

      <section id="signin" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Sign-in help</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">
          Give someone a new temporary password: a newly activated coach, or anyone locked out. You&apos;ll see it once
          at the top of the page. They choose their own the next time they sign in. This also clears a lockout from
          too many wrong passwords.
        </p>
        <form action="/api/settings" method="post" className="mt-4 flex max-w-xl flex-wrap items-end gap-3">
          <input type="hidden" name="intent" value="temp_password" />
          <label className="block flex-1 text-sm font-medium">
            Their email
            <input type="email" name="email" required className="field" />
          </label>
          <button className="btn">Create temporary password</button>
        </form>
      </section>

      <section id="access" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Access</h2>
        <p className="mt-1 text-sm text-ink/55">
          Managers always see every coach, student, note, appointment, and credit balance. Coaches
          only see their own students. Parents never see journals, chat, notes, or forms.
        </p>
        <form action="/api/settings" method="post" className="panel mt-4 space-y-3 rounded-xl p-6">
          <input type="hidden" name="intent" value="permissions" />
          {Object.entries(PERMISSIONS).map(([key, def]) => (
            <Toggle key={key} name={key} label={def.label} checked={permissions[key as keyof typeof permissions]} />
          ))}
          <button className="btn mt-2">Save access</button>
        </form>
      </section>

      <section id="types" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Appointment types</h2>
        <p className="mt-1 text-sm text-ink/55">
          Each type picks the note form the AI scribe fills in. Write the instructions the way you
          would brief an assistant.
        </p>
        <div className="mt-4 space-y-4">
          {[...types, null].map((type) => (
            <details key={type?.id ?? "new"} className="panel rounded-xl" open={!type && types.length === 0}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span className="font-medium">{type ? type.name : "+ Add appointment type"}</span>
                {type ? (
                  <span className="text-xs text-ink/50">
                    {KIND_LABELS[type.kind] ?? type.kind} · {type.durationMinutes} min ·{" "}
                    {type.clientCanBook ? "students can book" : "coach books"}
                    {type.active ? "" : " · off"}
                  </span>
                ) : null}
              </summary>
              <form action="/api/settings" method="post" className="grid gap-4 border-t border-ink/[0.08] p-5 sm:grid-cols-2">
                <input type="hidden" name="intent" value="appointment_type" />
                {type ? <input type="hidden" name="id" value={type.id} /> : null}
                <label className="block text-sm font-medium">
                  Name
                  <input name="name" required defaultValue={type?.name} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Session kind
                  <select name="kind" defaultValue={type?.kind ?? "follow_up"} className="field">
                    {Object.entries(KIND_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Length (minutes)
                  <input type="number" name="durationMinutes" min={15} max={180} step={5} defaultValue={type?.durationMinutes ?? 45} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Video provider
                  <select name="meetingProvider" defaultValue={type?.meetingProvider ?? settings.defaultMeetingProvider} className="field">
                    <option value="zoom_hipaa">Zoom for Healthcare (HIPAA)</option>
                    <option value="google_meet">Google Meet</option>
                  </select>
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <Toggle name="clientCanBook" label="Students and parents can book this type" checked={type?.clientCanBook ?? true} />
                  <Toggle name="isVideo" label="Video call" checked={type?.isVideo ?? true} />
                  <Toggle name="active" label="Available for booking" checked={type?.active ?? true} />
                </div>
                <label className="block text-sm font-medium sm:col-span-2">
                  AI scribe note form
                  <select name="scribeFormKey" defaultValue={type?.scribeFormKey ?? ""} className="field">
                    <option value="">No note form (summary only)</option>
                    {scribeForms.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  AI scribe instructions
                  <textarea
                    name="aiScribeInstructions"
                    rows={5}
                    defaultValue={type?.aiScribeInstructions}
                    placeholder="Refer to the student by first name. Include a summary of values, strengths, skills, supportive people and environment, and resources. Include two direct quotes."
                    className="field"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Confirmation email
                  <select name="confirmationTiming" defaultValue={type?.confirmationTiming ?? "immediate"} className="field">
                    <option value="immediate">Send immediately after booking</option>
                    <option value="none">Don&apos;t send</option>
                  </select>
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  Custom email for this type <span className="font-normal text-ink/45">(optional)</span>
                  <textarea name="confirmationEmailBody" rows={3} defaultValue={type?.confirmationEmailBody} className="field" />
                </label>
                <div className="sm:col-span-2">
                  <button className="btn">{type ? "Save type" : "Add type"}</button>
                </div>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section id="releases" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Automatic forms</h2>
        <p className="mt-1 text-sm text-ink/55">
          Send forms automatically around appointments. Edit form questions on the{" "}
          <Link href="/forms/builder" className="link-accent">
            form builder
          </Link>
          .
        </p>
        <div className="panel mt-4 overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-paper/70 text-left text-xs text-ink/50">
              <tr>
                <th className="px-4 py-2 font-medium">Form</th>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">For</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-ink/50">
                    No automatic releases yet.
                  </td>
                </tr>
              ) : null}
              {rules.map((rule) => (
                <tr key={rule.id} className={`border-t border-ink/[0.06] ${rule.active ? "" : "text-ink/40"}`}>
                  <td className="px-4 py-3 font-medium">{templateName(rule.templateKey)}</td>
                  <td className="px-4 py-3">
                    {rule.anchor === "after_booking" && rule.offsetMinutes === 0
                      ? "Right after booking"
                      : `${describeOffset(rule.offsetMinutes)} ${
                          rule.anchor === "before_appointment" ? "before the session" : rule.anchor === "after_booking" ? "after booking" : "after the session"
                        }`}
                  </td>
                  <td className="px-4 py-3">
                    {rule.appointmentKind === "any" ? "Any session" : KIND_LABELS[rule.appointmentKind]}
                    {rule.firstOnly ? " · first time only" : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <form action="/api/settings" method="post">
                        <input type="hidden" name="intent" value="release_rule_toggle" />
                        <input type="hidden" name="id" value={rule.id} />
                        <button className="btn-ghost">{rule.active ? "Pause" : "Turn on"}</button>
                      </form>
                      <form action="/api/settings" method="post">
                        <input type="hidden" name="intent" value="release_rule_delete" />
                        <input type="hidden" name="id" value={rule.id} />
                        <button className="btn-ghost">Remove</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action="/api/settings" method="post" className="grid gap-3 border-t border-ink/[0.08] bg-paper/40 p-4 sm:grid-cols-6 sm:items-end">
            <input type="hidden" name="intent" value="release_rule" />
            <label className="block text-xs font-medium sm:col-span-2">
              Form
              <select name="templateKey" className="field" required defaultValue="">
                <option value="" disabled>
                  Choose
                </option>
                {clientForms.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium">
              Amount
              <input type="number" name="offsetAmount" min={0} defaultValue={1} className="field" />
            </label>
            <label className="block text-xs font-medium">
              Unit
              <select name="offsetUnit" className="field" defaultValue="days">
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </label>
            <label className="block text-xs font-medium sm:col-span-2">
              Timing
              <select name="anchor" className="field" defaultValue="before_appointment">
                {Object.entries(RELEASE_ANCHORS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium sm:col-span-2">
              Session kind
              <select name="appointmentKind" className="field" defaultValue="any">
                <option value="any">Any session</option>
                {Object.entries(KIND_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="firstOnly" value="1" /> Only the student&apos;s first session
            </label>
            <div className="sm:col-span-2">
              <button className="btn w-full">Add rule</button>
            </div>
          </form>
        </div>
      </section>

      <section id="email" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Confirmation email</h2>
        <p className="mt-1 text-sm text-ink/55">
          Sent to the student, plus any parent who opted in to notifications. You can use{" "}
          <code className="text-xs">{"{{clientName}}"}</code>, <code className="text-xs">{"{{coachName}}"}</code>, and{" "}
          <code className="text-xs">{"{{startsAt}}"}</code>.
        </p>
        <form action="/api/settings" method="post" className="panel mt-4 space-y-4 rounded-xl p-6">
          <input type="hidden" name="intent" value="email" />
          <label className="block text-sm font-medium">
            Subject
            <input name="confirmationEmailSubject" defaultValue={settings.confirmationEmailSubject} className="field" />
          </label>
          <label className="block text-sm font-medium">
            Message
            <textarea name="confirmationEmailBody" rows={5} defaultValue={settings.confirmationEmailBody} className="field" />
          </label>
          <button className="btn">Save email</button>
        </form>
      </section>
    </Shell>
  );
}
