import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { FormFields } from "@/components/form-fields";
import { FIELD_TYPES, FORM_AUDIENCES, FORM_STAGES, fieldsToSpec, parseFields } from "@/lib/forms";

export default async function FormBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; notice?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!isLeadOrAdmin(user)) redirect("/forms");
  const { edit, error, notice } = await searchParams;

  const templates = await prisma.formTemplate.findMany({
    orderBy: [{ audience: "asc" }, { name: "asc" }],
    include: { _count: { select: { submissions: true } } },
  });
  const current = edit && edit !== "new" ? templates.find((t) => t.id === edit) : undefined;
  const fields = current ? parseFields(current.schemaJson) : [];

  return (
    <Shell user={user}>
      <p className="text-sm">
        <Link href="/forms" className="link-accent">
          ← Forms
        </Link>
      </p>
      <p className="label-caps mt-4 text-accent">Manager</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Form builder</h1>
      <p className="mt-2 max-w-2xl text-ink/60">
        Paste in your intake, high school, fulfillment compass, and session note forms. Scale
        questions tagged with [wellbeing] or [fulfillment] feed the Metrics charts automatically.
      </p>
      <Notice error={error} notice={notice} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="panel h-fit rounded-xl p-3">
          <Link href="/forms/builder?edit=new" className="btn mb-2 w-full">
            + New form
          </Link>
          {Object.entries(FORM_AUDIENCES).map(([aud, label]) => (
            <div key={aud} className="mt-2">
              <p className="label-caps px-2 py-1">{label}</p>
              {templates
                .filter((t) => t.audience === aud)
                .map((t) => (
                  <Link
                    key={t.id}
                    href={`/forms/builder?edit=${t.id}`}
                    className={`block rounded-md px-2 py-1.5 text-sm ${current?.id === t.id ? "bg-accent/10 text-accent-deep" : "hover:bg-ink/[0.04]"} ${t.active ? "" : "text-ink/40"}`}
                  >
                    {t.name}
                    <span className="ml-1 text-xs text-ink/40">{t._count.submissions}</span>
                  </Link>
                ))}
            </div>
          ))}
        </aside>

        {edit ? (
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <form action="/api/forms/templates" method="post" className="panel space-y-4 rounded-xl p-6">
              {current ? <input type="hidden" name="id" value={current.id} /> : null}
              <label className="block text-sm font-medium">
                Form name
                <input name="name" required defaultValue={current?.name} className="field" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  When
                  <select name="stage" defaultValue={current?.stage ?? "pre"} className="field">
                    {Object.entries(FORM_STAGES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Filled out by
                  <select name="audience" defaultValue={current?.audience ?? "client"} className="field">
                    {Object.entries(FORM_AUDIENCES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium">
                Intro text
                <textarea name="description" rows={2} defaultValue={current?.description} className="field" />
              </label>
              <label className="block text-sm font-medium">
                Questions, one per line
                <textarea
                  name="spec"
                  rows={14}
                  required
                  defaultValue={fieldsToSpec(fields)}
                  placeholder={"likert5 | I feel hopeful about my future [wellbeing]\nscale10 | How fulfilled do you feel right now? [fulfillment]\nchoice | What grade are you in? | 9; 10; 11; 12\nlongtext | ? Anything else you want your coach to know"}
                  className="field font-mono text-xs leading-relaxed"
                />
              </label>
              <details className="rounded-md bg-paper/70 p-3 text-xs text-ink/65">
                <summary className="cursor-pointer font-medium">How to write questions</summary>
                <p className="mt-2">
                  Format: <code>type | question | options</code>. Start a question with <code>?</code> to make it optional.
                </p>
                <ul className="mt-2 space-y-0.5">
                  {Object.entries(FIELD_TYPES).map(([key, label]) => (
                    <li key={key}>
                      <code>{key}</code> · {label}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">For AI scribe note forms, each line is a section the scribe fills in (use longtext).</p>
              </details>
              <div className="flex flex-wrap gap-2">
                <button className="btn">{current ? "Save form" : "Create form"}</button>
              </div>
            </form>
            <div className="space-y-4">
              {current ? (
                <form action="/api/forms/templates" method="post" className="flex items-center justify-between rounded-xl border border-ink/[0.08] bg-white px-5 py-3 text-sm">
                  <input type="hidden" name="id" value={current.id} />
                  <input type="hidden" name="intent" value="toggle" />
                  <span>
                    {current.active ? "Live" : "Off"} · {current._count.submissions} submissions · key{" "}
                    <code className="text-xs">{current.key}</code>
                  </span>
                  <button className="btn-ghost">{current.active ? "Turn off" : "Turn on"}</button>
                </form>
              ) : null}
              <section className="panel rounded-xl p-6">
                <p className="label-caps">Preview</p>
                {fields.length ? (
                  <div className="pointer-events-none mt-4 opacity-90">
                    <FormFields fields={fields} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/55">Save to see a preview.</p>
                )}
              </section>
            </div>
          </div>
        ) : (
          <p className="panel rounded-xl p-6 text-ink/60">Choose a form on the left, or create a new one.</p>
        )}
      </div>
    </Shell>
  );
}
