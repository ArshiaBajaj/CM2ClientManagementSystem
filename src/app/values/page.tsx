import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccessClient, isStaff } from "@/lib/access";
import { prisma } from "@/lib/db";
import { Notice, Shell } from "@/components/shell";
import { ValuesQuiz } from "@/components/values-quiz";
import { VALUES, VALUE_PAIRS, topValues, valueAngle, worldViewPoint, worldViewSummary } from "@/lib/values";

export default async function ValuesPage({
  searchParams,
}: {
  searchParams: Promise<{ retake?: string; error?: string; clientId?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { retake, error, clientId: requested } = await searchParams;

  let clientId = user.clientId ?? "";
  if (isStaff(user)) {
    if (!requested || !(await canAccessClient(user, requested)).ok) redirect("/clients");
    clientId = requested;
  } else if (user.role !== "client") {
    redirect("/workspace");
  }

  const [client, result] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.valuesResult.findFirst({ where: { clientId }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!client) redirect("/workspace");

  const showQuiz = user.role === "client" && (!result || retake === "1");
  const pairs = VALUE_PAIRS.map(([a, b]) => ({
    a: { index: a, statement: VALUES[a].statement },
    b: { index: b, statement: VALUES[b].statement },
  }));

  const scores = result ? (JSON.parse(result.scoresJson) as Record<string, number>) : {};
  const top = result ? topValues(scores) : [];
  const point = worldViewPoint(scores);

  let peers = 0;
  if (result) {
    const mine = new Set(result.topValues.split(","));
    const others = await prisma.valuesResult.findMany({
      where: { sharePeers: true, clientId: { not: clientId } },
      orderBy: { createdAt: "desc" },
    });
    const latestByClient = new Map<string, (typeof others)[number]>();
    for (const o of others) if (!latestByClient.has(o.clientId)) latestByClient.set(o.clientId, o);
    peers = [...latestByClient.values()].filter((o) => o.topValues.split(",").filter((k) => mine.has(k)).length >= 3).length;
  }

  return (
    <Shell user={user}>
      {isStaff(user) ? (
        <p className="text-sm">
          <Link href={`/clients/${client.id}`} className="link-accent">
            ← {client.firstName}&apos;s profile
          </Link>
        </p>
      ) : null}
      <p className="label-caps mt-2 text-accent">Values inventory</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {showQuiz ? "What matters most to you?" : isStaff(user) ? `${client.firstName}'s values` : "Your values"}
      </h1>
      <Notice error={error} />

      {showQuiz ? (
        <>
          <p className="mt-3 max-w-2xl text-ink/60">
            25 quick choices between two things people care about. Based on Schwartz&apos;s research on
            ten values found in cultures around the world. Takes about 5 minutes.
          </p>
          <ValuesQuiz pairs={pairs} />
        </>
      ) : !result ? (
        <p className="panel mt-6 rounded-xl p-6 text-ink/60">{client.firstName} hasn&apos;t taken the inventory yet.</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-3">
            {top.map((v, i) => (
              <article key={v.key} className="panel flex gap-4 rounded-xl p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-lg font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight">
                    {v.name} <span className="text-sm font-normal text-ink/45">({v.theory})</span>
                  </h2>
                  <p className="text-ink/65">{v.statement}.</p>
                  <p className="mt-2 text-sm">
                    <span className="text-ink/50">Personal statement idea: </span>
                    {v.prompt}
                  </p>
                </div>
              </article>
            ))}
            {user.role === "client" ? (
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/values?retake=1" className="btn-secondary">
                  Retake
                </Link>
                <Link href="/journal" className="btn-secondary">
                  Reflect in my journal
                </Link>
                <Link href="/portfolio" className="btn-secondary">
                  Match to my portfolio
                </Link>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <section className="panel rounded-xl p-5">
              <h2 className="font-display text-lg font-semibold tracking-tight">World view map</h2>
              <WorldViewMap scores={scores} point={point} />
              <p className="text-xs text-ink/45">
                Right: open to change. Left: stability. Up: caring for others. Down: personal success.
                The dark dot is where you sit.
              </p>
              <p className="mt-3 text-sm text-ink/70">{worldViewSummary(point)}</p>
            </section>
            <section className="panel rounded-xl p-5 text-sm">
              <h2 className="font-display text-lg font-semibold tracking-tight">Peers like you</h2>
              {result.sharePeers ? (
                <p className="mt-2 text-ink/70">
                  {peers === 0
                    ? "No other students share three of your top values yet."
                    : `${peers} other Coach Me 2 student${peers === 1 ? " shares" : "s share"} at least three of your top five values.`}
                </p>
              ) : (
                <p className="mt-2 text-ink/60">You&apos;re not included in peer counts.</p>
              )}
              {user.role === "client" ? (
                <form action="/api/values" method="post" className="mt-2">
                  <input type="hidden" name="intent" value="share" />
                  <button className="btn-ghost -ml-3">{result.sharePeers ? "Stop counting me" : "Count me anonymously"}</button>
                </form>
              ) : null}
            </section>
            <p className="text-xs text-ink/45">
              Taken {result.createdAt.toLocaleDateString()}. Draft instrument pending research team review.
            </p>
          </aside>
        </div>
      )}
    </Shell>
  );
}

function WorldViewMap({ scores, point }: { scores: Record<string, number>; point: { x: number; y: number } }) {
  const size = 300;
  const c = size / 2;
  const r = 110;
  const max = Math.max(1, ...Object.values(scores));
  const shape = VALUES.map((v, i) => {
    const a = valueAngle(i);
    const len = 20 + ((scores[v.key] ?? 0) / max) * (r - 20);
    return `${c + Math.cos(a) * len},${c - Math.sin(a) * len}`;
  }).join(" ");

  return (
    <svg viewBox={`-40 -10 ${size + 80} ${size + 20}`} className="mt-2 w-full" role="img" aria-label="Values circle">
      <circle cx={c} cy={c} r={r} fill="#f1f5fb" stroke="#d6e0ee" />
      <circle cx={c} cy={c} r={r / 2} fill="none" stroke="#e3e9f2" />
      <line x1={c - r} x2={c + r} y1={c} y2={c} stroke="#d6e0ee" />
      <line x1={c} x2={c} y1={c - r} y2={c + r} stroke="#d6e0ee" />
      <polygon points={shape} fill="rgba(59,127,196,0.22)" stroke="#3b7fc4" strokeWidth={1.5} />
      {VALUES.map((v, i) => {
        const a = valueAngle(i);
        const lx = c + Math.cos(a) * (r + 22);
        const ly = c - Math.sin(a) * (r + 22);
        return (
          <text key={v.key} x={lx} y={ly + 3} textAnchor="middle" className="fill-ink/60 text-[9px] font-medium">
            {v.name}
          </text>
        );
      })}
      <circle cx={c + point.x * r} cy={c - point.y * r} r={7} fill="#1a3350" stroke="white" strokeWidth={2} />
    </svg>
  );
}
