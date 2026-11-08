import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { guardClientWorkspace } from "@/lib/gate";
import { Notice, Shell } from "@/components/shell";
import { TIMEZONES } from "@/lib/timezones";

/** A coach adds one of their own clients. It lives only in that coach's private caseload. */
export default async function NewPrivateClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role !== "coach") redirect("/clients");
  const { error } = await searchParams;

  return (
    <Shell user={user}>
      <Link href="/clients" className="text-sm text-ink/55 hover:text-ink">
        ← Clients
      </Link>
      <h1 className="mt-3 font-display text-4xl">Add my own client</h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Coach someone outside Coach Me 2 with the same tools: calendar, chat, notes, goals, and forms. This client
        is private to you. Program managers and other coaches can&apos;t see them, and Coach Me 2 credits aren&apos;t
        used for their sessions. Your calendar only shows that time as busy.
      </p>
      <Notice error={error} />

      <form action="/api/clients/private" method="post" className="panel mt-8 max-w-2xl space-y-6 rounded-xl p-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-display text-lg font-semibold tracking-tight">Client</legend>
          <label className="block text-sm font-medium">
            First name
            <input name="firstName" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Last name
            <input name="lastName" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Date of birth
            <input type="date" name="dateOfBirth" required className="field" />
          </label>
          <label className="block text-sm font-medium">
            Time zone
            <select name="timezone" className="field" defaultValue="America/New_York">
              {TIMEZONES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Email (optional)
            <input type="email" name="clientEmail" className="field" />
          </label>
          <label className="block text-sm font-medium">
            Phone (optional)
            <input name="clientPhone" className="field" />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="createClientLogin" value="1" />
            Create a portal login for them (needs an email; they set their own password on first sign-in)
          </label>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 font-display text-lg font-semibold tracking-tight">Parent or guardian (optional)</legend>
          <label className="block text-sm font-medium">
            Name
            <input name="guardianName" className="field" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input type="email" name="guardianEmail" className="field" />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input name="guardianPhone" className="field" />
          </label>
          <label className="block text-sm font-medium">
            Relationship
            <input name="relationship" placeholder="parent" className="field" />
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button className="btn">Add client</button>
          <Link href="/clients" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </Shell>
  );
}
