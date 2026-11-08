import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, isStaff, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { AnswerList, FormFields } from "@/components/form-fields";
import { FORM_STAGES, parseFields } from "@/lib/forms";
import { releaseDueForms } from "@/lib/releases";

type Search = { error?: string; notice?: string; clientId?: string; fill?: string };

export default async function FormsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace?error=Student%20forms%20are%20confidential");
  await releaseDueForms();

  const params = await searchParams;
  return isStaff(user) ? <StaffForms user={user} {...params} /> : <ClientForms user={user} {...params} />;
}

async function ClientForms({ user, error, notice, fill }: { user: NonNullable<Awaited<ReturnType<typeof getSession>>> } & Search) {
  const clientId = user.clientId ?? "";
  const [releases, templates, submissions] = await Promise.all([
    prisma.formRelease.findMany({
      where: { clientId, status: "released" },
      include: { template: true },
      orderBy: { releaseAt: "asc" },
    }),
    prisma.formTemplate.findMany({ where: { active: true, audience: "client" }, orderBy: { name: "asc" } }),
    prisma.formSubmission.findMany({ where: { clientId }, include: { template: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const open = fill ? templates.find((t) => t.key === fill) : undefined;
  const releasedKeys = new Set(releases.map((r) => r.template.key));

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Forms</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {open ? open.name : "Your forms"}
      </h1>
      <Notice error={error} notice={notice} />

      {open ? (
        <form action="/api/forms/submit" method="post" className="panel mt-6 max-w-2xl space-y-6 rounded-xl p-6">
          {open.description ? <p className="text-sm text-ink/60">{open.description}</p> : null}
          <input type="hidden" name="templateId" value={open.id} />
          <input type="hidden" name="clientId" value={clientId} />
          <FormFields fields={parseFields(open.schemaJson)} />
          <div className="flex gap-3">
            <button className="btn">Submit</button>
            <Link href="/forms" className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="panel rounded-xl p-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">To do</h2>
            <ul className="mt-3 space-y-2">
              {releases.length === 0 ? <li className="text-sm text-ink/55">Nothing waiting for you.</li> : null}
              {releases.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/forms?fill=${r.template.key}`}
                    className="flex items-center justify-between rounded-md border border-ink/[0.08] p-3 text-sm hover:border-accent/40"
                  >
                    <span className="font-medium">{r.template.name}</span>
                    <span className="text-accent">Start →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel rounded-xl p-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">Other forms</h2>
            <ul className="mt-3 space-y-2">
              {templates
                .filter((t) => !releasedKeys.has(t.key) && t.stage !== "scribe")
                .map((t) => (
                  <li key={t.id}>
                    <Link href={`/forms?fill=${t.key}`} className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-accent/5">
                      <span>{t.name}</span>
                      <span className="text-xs text-ink/45">
                        {submissions.some((s) => s.templateId === t.id) ? "Submitted" : FORM_STAGES[t.stage as keyof typeof FORM_STAGES] ?? t.stage}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      )}
    </Shell>
  );
}

async function StaffForms({
  user,
  error,
  notice,
  clientId,
  fill,
}: { user: NonNullable<Awaited<ReturnType<typeof getSession>>> } & Search) {
  const manager = isLeadOrAdmin(user);
  const coachId = manager ? null : await resolveCoachId(user);
  const clients = await prisma.client.findMany({
    where: { archivedAt: null, ...(coachId ? { assignments: { some: { coachId, status: "active" } } } : {}) },
    orderBy: { lastName: "asc" },
  });
  const selected = clients.find((c) => c.id === clientId);
  const templates = await prisma.formTemplate.findMany({
    where: { active: true, audience: { in: ["client", "coach"] } },
    orderBy: [{ audience: "asc" }, { name: "asc" }],
  });
  const open = fill ? templates.find((t) => t.key === fill) : undefined;

  const submissions = await prisma.formSubmission.findMany({
    where: { clientId: selected ? selected.id : { in: clients.map((c) => c.id) } },
    include: { template: true, client: true },
    orderBy: { createdAt: "desc" },
    take: selected ? 30 : 15,
  });
  const releases = selected
    ? await prisma.formRelease.findMany({
        where: { clientId: selected.id, status: { in: ["scheduled", "released"] } },
        include: { template: true },
        orderBy: { releaseAt: "asc" },
      })
    : [];

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Forms</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Forms</h1>
          <p className="mt-2 max-w-2xl text-ink/60">
            Every answer is stored under the student&apos;s anonymous client ID, so exports for research
            never include names.
          </p>
        </div>
        {manager ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/forms/builder" className="btn-secondary">
              Form builder
            </Link>
            <a href="/api/forms/export?template=all" className="btn">
              Download spreadsheet
            </a>
          </div>
        ) : null}
      </div>
      <Notice error={error} notice={notice} />

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium">
          Student
          <select name="clientId" defaultValue={selected?.id ?? ""} className="field min-w-72">
            <option value="">All my students</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName} · {c.publicId}
              </option>
            ))}
          </select>
        </label>
        <button className="btn-secondary">Show</button>
      </form>

      {selected && open ? (
        <form action="/api/forms/submit" method="post" className="panel mt-6 max-w-2xl space-y-6 rounded-xl p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {open.name} · {selected.firstName}
          </h2>
          <input type="hidden" name="templateId" value={open.id} />
          <input type="hidden" name="clientId" value={selected.id} />
          {open.audience === "client" ? (
            <label className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" name="onBehalf" value="1" required className="mt-1" />
              I am entering {selected.firstName}&apos;s own answers (for example, from a paper copy).
            </label>
          ) : null}
          <FormFields fields={parseFields(open.schemaJson)} />
          <div className="flex gap-3">
            <button className="btn">Submit</button>
            <Link href={`/forms?clientId=${selected.id}`} className="btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      ) : null}

      {selected && !open ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="panel rounded-xl p-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">Sent to {selected.firstName}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {releases.length === 0 ? <li className="text-ink/55">Nothing outstanding.</li> : null}
              {releases.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span>{r.template.name}</span>
                  <span className="text-xs text-ink/50">
                    {r.status === "scheduled" ? `Sends ${r.releaseAt.toLocaleString()}` : "Waiting for answers"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel rounded-xl p-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">Fill in a form</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {templates.map((t) => (
                <li key={t.id}>
                  <Link href={`/forms?clientId=${selected.id}&fill=${t.key}`} className="flex justify-between rounded-md p-2 hover:bg-accent/5">
                    <span>{t.name}</span>
                    <span className="text-xs text-ink/45">{t.audience === "coach" ? "Coach form" : "Student form"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Submitted</h2>
        <div className="mt-4 space-y-3">
          {submissions.length === 0 ? <p className="text-ink/55">No submissions yet.</p> : null}
          {submissions.map((s) => (
            <details key={s.id} className="panel rounded-xl">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="font-medium">{s.template.name}</span>
                <span className="text-xs text-ink/50">
                  <span className="font-mono">{s.client.publicId}</span> · {s.client.firstName} {s.client.lastName} ·{" "}
                  {s.createdAt.toLocaleDateString()}
                </span>
              </summary>
              <div className="border-t border-ink/[0.08] px-5 py-4">
                <AnswerList fields={parseFields(s.template.schemaJson)} answers={JSON.parse(s.answersJson) as Record<string, string>} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </Shell>
  );
}
