import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGuardianHouseholdId, isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { documentStatusFor } from "@/lib/documents";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { error, notice } = await searchParams;

  if (isLeadOrAdmin(user)) return <ManagerDocuments user={user} error={error} notice={notice} />;
  if (user.role !== "client" && user.role !== "guardian") redirect("/workspace");

  const role = user.role;
  const students =
    role === "client"
      ? await prisma.client.findMany({ where: { id: user.clientId ?? "" } })
      : await prisma.client.findMany({
          where: { householdId: (await getGuardianHouseholdId(user)) ?? "", archivedAt: null },
        });

  const statuses = await Promise.all(
    students.map(async (s) => ({ student: s, docs: (await documentStatusFor(s.id)).filter((d) => d.signers.includes(role)) })),
  );

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Paperwork</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Documents to sign</h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        {role === "guardian"
          ? "Coaching is confidential between your student and their coach. These agreements explain how it works and when we would contact you."
          : "Read each agreement, then type your full name to sign."}
      </p>
      <Notice error={error} notice={notice} />

      {statuses.map(({ student, docs }) => (
        <section key={student.id} className="mt-8">
          {role === "guardian" ? (
            <h2 className="font-display text-xl font-semibold tracking-tight">For {student.firstName}</h2>
          ) : null}
          <div className="mt-3 space-y-4">
            {docs.length === 0 ? <p className="panel rounded-xl p-5 text-ink/55">Nothing to sign right now.</p> : null}
            {docs.map((doc) => {
              const mine = doc.signed[role];
              return (
                <details key={doc.id} className="panel rounded-xl" open={!mine}>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
                    <span className="font-medium">{doc.title}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        mine ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                      }`}
                    >
                      {mine ? `Signed ${mine.at.toLocaleDateString()}` : "Needs your signature"}
                    </span>
                  </summary>
                  <div className="border-t border-ink/[0.08] px-5 py-4">
                    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md bg-paper/70 p-4 text-sm leading-relaxed text-ink/80">
                      {doc.body}
                    </div>
                    {mine ? (
                      <p className="mt-3 text-sm text-ink/60">
                        Signed by <span className="font-medium">{mine.name}</span> (version {doc.version}).
                      </p>
                    ) : (
                      <form action="/api/documents" method="post" className="mt-4 space-y-3">
                        <input type="hidden" name="documentId" value={doc.id} />
                        <input type="hidden" name="clientId" value={student.id} />
                        <label className="flex items-start gap-2 text-sm">
                          <input type="checkbox" name="agree" value="1" required className="mt-1" />I have read
                          this and agree.
                        </label>
                        <label className="block text-sm font-medium">
                          Type your full name to sign
                          <input name="signature" required minLength={3} defaultValue="" placeholder={user.name} className="field max-w-sm font-display text-lg" />
                        </label>
                        <button className="btn">Sign</button>
                      </form>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </Shell>
  );
}

async function ManagerDocuments({
  user,
  error,
  notice,
}: {
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  error?: string;
  notice?: string;
}) {
  const [templates, clients] = await Promise.all([
    prisma.documentTemplate.findMany({
      orderBy: { createdAt: "asc" },
      include: { signatures: { where: { client: { program: "cm2" } } } },
    }),
    prisma.client.count({ where: { archivedAt: null, program: "cm2" } }),
  ]);

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Paperwork</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Documents</h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        Agreements students and parents sign in their portals. Changing the text creates a new
        version, and everyone is asked to sign again.
      </p>
      <Notice error={error} notice={notice} />

      <div className="mt-8 space-y-4">
        {[...templates, null].map((doc) => {
          const signedCurrent = doc?.signatures.filter((s) => s.version === doc.version) ?? [];
          return (
            <details key={doc?.id ?? "new"} className="panel rounded-xl">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-4">
                <span className="font-medium">{doc ? doc.title : "+ Add document"}</span>
                {doc ? (
                  <span className="text-xs text-ink/50">
                    {doc.signers.split(",").map((s) => (s === "client" ? "Student" : "Parent")).join(" + ")} sign ·{" "}
                    {signedCurrent.length} signatures on v{doc.version} · {clients} active students
                    {doc.active ? "" : " · off"}
                  </span>
                ) : null}
              </summary>
              <form action="/api/documents" method="post" className="space-y-3 border-t border-ink/[0.08] p-5">
                <input type="hidden" name="intent" value="template" />
                {doc ? <input type="hidden" name="id" value={doc.id} /> : null}
                <label className="block text-sm font-medium">
                  Title
                  <input name="title" required defaultValue={doc?.title} className="field" />
                </label>
                <label className="block text-sm font-medium">
                  Text
                  <textarea name="body" rows={10} required defaultValue={doc?.body} className="field" />
                </label>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="signers" value="client" defaultChecked={doc ? doc.signers.includes("client") : true} />
                    Student signs
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="signers" value="guardian" defaultChecked={doc ? doc.signers.includes("guardian") : true} />
                    Parent signs
                  </label>
                  {doc ? (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="active" value="1" defaultChecked={doc.active} />
                      Active
                    </label>
                  ) : null}
                </div>
                <button className="btn">{doc ? "Save" : "Add document"}</button>
              </form>
            </details>
          );
        })}
      </div>
    </Shell>
  );
}
