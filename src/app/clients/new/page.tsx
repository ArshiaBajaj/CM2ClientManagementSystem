import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { FOCUS_AREAS, TIME_WINDOWS, splitList } from "@/lib/matching";
import { TIMEZONES } from "@/lib/timezones";

export default async function EnrollClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; requestId?: string; coachId?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/workspace");
  const { error, requestId, coachId } = await searchParams;

  const req = requestId ? await prisma.coachRequest.findUnique({ where: { id: requestId } }) : null;
  const coach = coachId ? await prisma.coachRoster.findUnique({ where: { coachId } }) : null;
  const [first = "", ...rest] = (req?.studentName ?? "").split(" ");
  const last = rest.join(" ");
  const interests = new Set(splitList(req?.interests ?? ""));
  const times = new Set(splitList(req?.preferredTimes ?? ""));

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href={req ? "/matching" : "/clients"} className="link-accent">
          ← {req ? "Matching" : "Clients"}
        </Link>
      </p>
      <p className="label-caps mt-4 text-accent">Enrollment</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Enroll a student</h1>
      <p className="mt-3 max-w-2xl text-ink/60">
        Each student gets an anonymous client ID for forms and research exports. Parents are added
        as emergency contacts and never see the confidential student pages.
      </p>
      {req ? (
        <p className="mt-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent-deep">
          Filled in from {req.studentName}&apos;s website request
          {coach ? `. They will be paired with ${coach.name}.` : "."}
        </p>
      ) : null}
      <Notice error={error} />

      <form action="/api/households" method="post" className="panel mt-8 grid max-w-2xl gap-6 rounded-xl p-6">
        {req ? <input type="hidden" name="requestId" value={req.id} /> : null}
        {coach ? <input type="hidden" name="coachId" value={coach.coachId} /> : null}

        <fieldset className="space-y-4">
          <legend className="font-display text-xl font-semibold tracking-tight">Student</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              First name
              <input name="firstName" required defaultValue={first} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Last name
              <input name="lastName" required defaultValue={last} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Date of birth
              <input type="date" name="dateOfBirth" required className="field" />
            </label>
            <label className="block text-sm font-medium">
              Household name
              <input
                name="householdName"
                required
                defaultValue={last ? `${last} household` : ""}
                placeholder="Rivera household"
                className="field"
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input type="email" name="clientEmail" defaultValue={req?.studentEmail} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Phone
              <input name="clientPhone" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Location
              <input name="location" placeholder="City, State" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Time zone
              <select name="timezone" defaultValue={req?.timezone ?? "America/New_York"} className="field">
                {TIMEZONES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Group
              <input name="group" placeholder="e.g. Fall 2026 cohort" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Starting session credits
              <input type="number" name="starterCredits" min={0} max={48} defaultValue={6} className="field" />
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="createClientLogin" value="1" defaultChecked={Boolean(req)} className="mt-1" />
            <span>
              Create a student login. You&apos;ll see a temporary password once, to share privately; they set their own
              at first sign-in.
            </span>
          </label>
        </fieldset>

        <fieldset className="space-y-3 border-t border-ink/[0.08] pt-5">
          <legend className="font-display text-xl font-semibold tracking-tight">Matching details</legend>
          <p className="text-sm font-medium">What they want help with</p>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <label key={area} className="chip">
                <input type="checkbox" name="interests" value={area} defaultChecked={interests.has(area)} />
                {area}
              </label>
            ))}
          </div>
          <p className="pt-2 text-sm font-medium">Times that work</p>
          <div className="flex flex-wrap gap-2">
            {TIME_WINDOWS.map((w) => (
              <label key={w.key} className="chip">
                <input type="checkbox" name="preferredTimes" value={w.key} defaultChecked={times.has(w.key)} />
                {w.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-ink/[0.08] pt-5">
          <legend className="font-display text-xl font-semibold tracking-tight">Parent / emergency contact</legend>
          <p className="text-sm text-ink/60">
            Parents see appointments, credits, documents to sign, and short progress updates. They do
            not see journals, chat, notes, or forms.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Name
              <input name="guardianName" defaultValue={req?.parentName} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input type="email" name="guardianEmail" defaultValue={req?.parentEmail} className="field" />
            </label>
            <label className="block text-sm font-medium">
              Phone
              <input name="guardianPhone" className="field" />
            </label>
            <label className="block text-sm font-medium">
              Relationship
              <select name="relationship" defaultValue="parent" className="field">
                <option value="parent">Parent</option>
                <option value="guardian">Legal guardian</option>
                <option value="caregiver">Caregiver</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="createGuardianLogin" value="1" className="mt-1" defaultChecked />
            <span>
              Create a parent login (with its own one-time temporary password) if the email is new.
            </span>
          </label>
        </fieldset>

        <button className="btn">Enroll student</button>
      </form>
    </Shell>
  );
}
