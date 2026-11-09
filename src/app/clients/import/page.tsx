import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { Notice, Shell } from "@/components/shell";

/** Bulk-add students and parents from one spreadsheet, such as a Healthie client export. */
export default async function ImportClientsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/clients");
  const { error } = await searchParams;

  return (
    <Shell user={user}>
      <Link href="/clients" className="text-sm text-ink/60 hover:text-ink">
        ← Clients
      </Link>
      <h1 className="mt-3 font-display text-5xl">Import clients</h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Add everyone at once from a spreadsheet, such as your client list exported from Healthie. Save it as a CSV file
        first (in Excel or Google Sheets: File → Download → CSV).
      </p>
      <Notice error={error} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          action="/api/clients/import"
          method="post"
          encType="multipart/form-data"
          className="panel space-y-5 rounded-2xl p-6"
        >
          <label className="block text-sm font-medium">
            Client spreadsheet (CSV)
            <input type="file" name="file" accept=".csv,text/csv" required className="field" />
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="studentLogins" value="1" defaultChecked className="mt-1" />
            <span>Create student logins (for rows with a student email)</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="parentLogins" value="1" defaultChecked className="mt-1" />
            <span>Create parent logins (for rows with a parent email)</span>
          </label>
          <button className="btn">Import and download results</button>
          <p className="text-xs text-ink/70">
            A results file downloads with every row&apos;s outcome and each new person&apos;s temporary password. Share
            each password privately, then delete the file. Anyone already in the portal is skipped.
          </p>
        </form>

        <aside className="space-y-4 text-sm text-ink/75">
          <h2 className="font-display text-2xl text-ink">What the file needs</h2>
          <p>A header row, then one client per row. Column names can vary; these are recognised:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Required:</strong> First name and Last name (or one Name column)
            </li>
            <li>Date of birth (any common format)</li>
            <li>Email and Phone (the student&apos;s)</li>
            <li>Parent name, Parent email, Parent phone (Guardian or Emergency contact also work)</li>
          </ul>
          <p>
            After importing, pair each student with a coach on the{" "}
            <Link href="/matching" className="link-accent">
              Matching
            </Link>{" "}
            page.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
