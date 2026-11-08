import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLeadOrAdmin, isStaff, resolveCoachId } from "@/lib/access";
import { guardClientWorkspace } from "@/lib/gate";
import { prisma } from "@/lib/db";
import { clientScope } from "@/lib/caseload";
import { Shell } from "@/components/shell";
import { parseFields, toTenPoint } from "@/lib/forms";

const STAGES = ["pre", "mid", "post"] as const;

function avg(list: number[]) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : null;
}

function fmt(n: number | null) {
  return n === null ? "—" : n.toFixed(1);
}

function delta(a: number | null, b: number | null) {
  if (a === null || b === null) return null;
  return b - a;
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  await guardClientWorkspace(user);
  if (user.role === "guardian") redirect("/workspace?error=Progress%20metrics%20stay%20between%20student%20and%20coach");
  const { clientId } = await searchParams;

  const manager = isLeadOrAdmin(user);
  const coachId = user.role === "coach" ? await resolveCoachId(user) : null;
  const scoped =
    user.role === "client"
      ? await prisma.client.findMany({ where: { id: user.clientId ?? "" } })
      : await prisma.client.findMany({
          where: await clientScope(user, coachId),
          orderBy: { lastName: "asc" },
        });
  const clients = clientId && isStaff(user) ? scoped.filter((c) => c.id === clientId) : scoped;
  const ids = clients.map((c) => c.id);

  const [snapshots, submissions] = await Promise.all([
    prisma.metricSnapshot.findMany({ where: { clientId: { in: ids } }, orderBy: { capturedAt: "asc" } }),
    prisma.formSubmission.findMany({
      where: { clientId: { in: ids }, template: { stage: { in: [...STAGES] } } },
      include: { template: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  type Q = { label: string; byStage: Record<string, Map<string, number>> };
  const questions = new Map<string, Q>();
  for (const s of submissions) {
    const answers = JSON.parse(s.answersJson) as Record<string, string>;
    for (const field of parseFields(s.template.schemaJson)) {
      const score = toTenPoint(field, answers[field.id] ?? "");
      if (score === null) continue;
      const q: Q = questions.get(field.id) ?? {
        label: field.label,
        byStage: { pre: new Map<string, number>(), mid: new Map<string, number>(), post: new Map<string, number>() },
      };
      q.byStage[s.template.stage]?.set(s.clientId, score);
      questions.set(field.id, q);
    }
  }
  const questionRows = [...questions.entries()]
    .map(([id, q]) => {
      const pre = avg([...q.byStage.pre.values()]);
      const mid = avg([...q.byStage.mid.values()]);
      const post = avg([...q.byStage.post.values()]);
      return { id, label: q.label, pre, mid, post, n: q.byStage.pre.size, change: delta(pre, post ?? mid) };
    })
    .filter((r) => [r.pre, r.mid, r.post].filter((v) => v !== null).length >= 2)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0));

  const byClient = clients
    .map((c) => ({ client: c, snaps: snapshots.filter((s) => s.clientId === c.id) }))
    .filter((x) => x.snaps.length > 0);
  const firstLast = byClient.filter((x) => x.snaps.length >= 2);
  const wbChange = avg(firstLast.map((x) => x.snaps[x.snaps.length - 1].wellBeingScore - x.snaps[0].wellBeingScore));
  const fuChange = avg(firstLast.map((x) => x.snaps[x.snaps.length - 1].fulfillmentScore - x.snaps[0].fulfillmentScore));
  const selected = clientId ? clients[0] : undefined;

  return (
    <Shell user={user}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-accent">Impact</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {user.role === "client" ? "My progress" : selected ? `${selected.firstName}'s progress` : "Metrics"}
          </h1>
          <p className="mt-2 max-w-2xl text-ink/60">
            Well-being and fulfillment from the pre-, mid-, and post-coaching forms. Scores are
            converted to a 0–10 scale so different question types can be compared.
          </p>
        </div>
        {manager ? (
          <a href="/api/forms/export?template=all" className="btn-secondary">
            Download spreadsheet
          </a>
        ) : null}
      </div>

      {isStaff(user) ? (
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">
            Student
            <select name="clientId" defaultValue={clientId ?? ""} className="field min-w-72">
              <option value="">{manager ? "Whole program" : "All my students"}</option>
              {scoped.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} · {c.publicId}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-secondary">Show</button>
        </form>
      ) : null}

      {isStaff(user) && !selected ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Students with data" value={String(byClient.length)} />
          <Stat label="Avg well-being change" value={wbChange === null ? "—" : `${wbChange >= 0 ? "+" : ""}${wbChange.toFixed(1)}`} />
          <Stat label="Avg fulfillment change" value={fuChange === null ? "—" : `${fuChange >= 0 ? "+" : ""}${fuChange.toFixed(1)}`} />
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {byClient.length === 0 ? (
          <p className="panel rounded-xl p-6 text-ink/60">
            No scores yet. They appear once a pre-coaching form is submitted.
          </p>
        ) : null}
        {byClient.map(({ client, snaps }) => (
          <article key={client.id} className="panel rounded-xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {isStaff(user) ? (
                  <Link href={`/clients/${client.id}`} className="hover:text-accent">
                    {client.firstName} {client.lastName}
                  </Link>
                ) : (
                  "Over time"
                )}
              </h2>
              <span className="font-mono text-xs text-ink/45">{client.publicId}</span>
            </div>
            <TrendChart snaps={snaps} />
          </article>
        ))}
      </div>

      {questionRows.length > 0 ? (
        <section className="panel mt-8 overflow-hidden rounded-xl">
          <div className="px-5 py-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">Question by question</h2>
            <p className="text-sm text-ink/55">
              Average answer (0–10) at each stage{selected || user.role === "client" ? "" : " across students"}.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-paper/70 text-left text-xs text-ink/50">
                <tr>
                  <th className="px-5 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 text-right font-medium">Pre</th>
                  <th className="px-3 py-2 text-right font-medium">Mid</th>
                  <th className="px-3 py-2 text-right font-medium">Post</th>
                  <th className="px-5 py-2 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {questionRows.map((r) => (
                  <tr key={r.id} className="border-t border-ink/[0.06]">
                    <td className="px-5 py-2.5">{r.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.pre)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.mid)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.post)}</td>
                    <td
                      className={`px-5 py-2.5 text-right font-medium tabular-nums ${
                        r.change === null ? "" : r.change > 0.05 ? "text-emerald-700" : r.change < -0.05 ? "text-signal" : "text-ink/50"
                      }`}
                    >
                      {r.change === null ? "—" : `${r.change >= 0 ? "+" : ""}${r.change.toFixed(1)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-xl p-5">
      <p className="label-caps">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function TrendChart({
  snaps,
}: {
  snaps: Array<{ id: string; stage: string; wellBeingScore: number; fulfillmentScore: number; capturedAt: Date }>;
}) {
  const w = 560;
  const h = 170;
  const pad = { l: 28, r: 12, t: 12, b: 28 };
  const x = (i: number) => pad.l + (snaps.length === 1 ? (w - pad.l - pad.r) / 2 : (i * (w - pad.l - pad.r)) / (snaps.length - 1));
  const y = (v: number) => pad.t + ((10 - v) * (h - pad.t - pad.b)) / 10;
  const line = (key: "wellBeingScore" | "fulfillmentScore") => snaps.map((s, i) => `${i ? "L" : "M"}${x(i)},${y(s[key])}`).join(" ");
  const first = snaps[0];
  const last = snaps[snaps.length - 1];

  return (
    <div className="mt-3 grid gap-4 md:grid-cols-[1fr_200px]">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Well-being and fulfillment over time">
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-ink/10" />
            <text x={4} y={y(v) + 4} className="fill-ink/40 text-[10px]">
              {v}
            </text>
          </g>
        ))}
        <path d={line("wellBeingScore")} fill="none" stroke="#3b7fc4" strokeWidth={2.5} />
        <path d={line("fulfillmentScore")} fill="none" stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 4" />
        {snaps.map((s, i) => (
          <g key={s.id}>
            <circle cx={x(i)} cy={y(s.wellBeingScore)} r={4} fill="#3b7fc4" />
            <circle cx={x(i)} cy={y(s.fulfillmentScore)} r={4} fill="#10b981" />
            <text x={x(i)} y={h - 8} textAnchor="middle" className="fill-ink/50 text-[10px]">
              {s.stage} · {s.capturedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          </g>
        ))}
      </svg>
      <div className="space-y-3 text-sm">
        <Legend color="bg-accent" label="Well-being" from={first.wellBeingScore} to={last.wellBeingScore} />
        <Legend color="bg-emerald-500" label="Fulfillment" from={first.fulfillmentScore} to={last.fulfillmentScore} />
      </div>
    </div>
  );
}

function Legend({ color, label, from, to }: { color: string; label: string; from: number; to: number }) {
  const d = to - from;
  return (
    <div className="rounded-lg border border-ink/[0.08] p-3">
      <p className="flex items-center gap-2 text-ink/60">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold tracking-tight">
        {from} → {to}{" "}
        <span className={`text-sm ${d > 0 ? "text-emerald-700" : d < 0 ? "text-signal" : "text-ink/45"}`}>
          ({d >= 0 ? "+" : ""}
          {d})
        </span>
      </p>
    </div>
  );
}
