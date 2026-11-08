import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Notice } from "@/components/shell";
import { FOCUS_AREAS, TIME_WINDOWS } from "@/lib/matching";
import { TIMEZONES } from "@/lib/timezones";

export default async function GetACoachPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl px-6 py-14">
        <p className="label-caps text-accent">Get a coach</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Find your coach</h1>
        <p className="mt-3 text-ink/60">
          Tell us a little about yourself. A program lead reviews three coaches who fit your schedule
          and goals, then reaches out to get you started.
        </p>

        {sent ? (
          <div className="panel mt-8 rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">Thanks, we got it.</h2>
            <p className="mt-2 text-ink/65">
              We&apos;ll email you within a few days with your coach match. Already have a coach?{" "}
              <Link href="/login" className="link-accent">
                Sign in to your portal
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <Notice error={error} />
            <form action="/api/coach-requests" method="post" className="panel mt-8 space-y-6 rounded-xl p-6">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <fieldset className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-2 font-display text-lg font-semibold tracking-tight">About you</legend>
                <label className="block text-sm font-medium">
                  Your name
                  <input name="studentName" required className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Your email
                  <input type="email" name="studentEmail" required className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Grade
                  <select name="grade" className="field" defaultValue="">
                    <option value="">Select</option>
                    {["8", "9", "10", "11", "12", "College"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Time zone
                  <select name="timezone" className="field" defaultValue="America/New_York">
                    {TIMEZONES.map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium">What would you like help with?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((area) => (
                    <label key={area} className="chip">
                      <input type="checkbox" name="interests" value={area} />
                      {area}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium">When are you usually free?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_WINDOWS.map((w) => (
                    <label key={w.key} className="chip">
                      <input type="checkbox" name="preferredTimes" value={w.key} />
                      {w.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block text-sm font-medium">
                Anything else you want us to know? <span className="font-normal text-ink/45">(optional)</span>
                <textarea name="notes" rows={3} className="field" />
              </label>

              <fieldset className="grid gap-4 border-t border-ink/[0.08] pt-5 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-medium">
                  Parent or guardian <span className="font-normal text-ink/45">(required if you are under 18)</span>
                </legend>
                <label className="block text-sm font-medium">
                  Name
                  <input name="parentName" className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <input type="email" name="parentEmail" className="field" />
                </label>
              </fieldset>

              <button className="btn w-full">Request a coach</button>
            </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}
