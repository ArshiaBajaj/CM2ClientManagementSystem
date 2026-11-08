import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PacketCard } from "@/components/access-packet";
import { Guide } from "@/components/guide";
import { Notice, Shell } from "@/components/shell";
import { coachGate, packetsFor } from "@/lib/gate";
import { prisma } from "@/lib/db";

export default async function CoachOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; fill?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "coach") redirect("/workspace");

  const gate = await coachGate(user);
  if (gate === "inactive") redirect("/workspace");

  const roster = await prisma.coachRoster.findFirst({
    where: { OR: [{ coachId: user.coachId ?? "" }, { email: user.email }] },
  });
  if (!roster) redirect("/workspace");

  const { error, notice, fill } = await searchParams;
  const packets = await packetsFor(roster.coachId, "coach");
  const remaining = packets.filter((packet) => !packet.done);
  const open = packets.find((packet) => packet.key === fill) ?? remaining[0];
  const doneCount = packets.length - remaining.length;

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Coach onboarding</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        {gate === "ready" ? "You're cleared to coach" : "Finish your forms to open the coach workspace"}
      </h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        {gate === "ready"
          ? "Your agreements are on file. Home, chat, calendar, and your students are in the sidebar."
          : `${doneCount} of ${packets.length} signed. Students, chat, and calendar stay closed until the last form is signed.`}
      </p>
      <Guide
        steps={[
          { title: "Read and sign", body: "Work down the list. Each form asks you to tick the box and type your full name." },
          { title: "Profile last", body: "The last form is how you coach and how many students you can take. Managers use it for matching." },
          { title: "Workspace opens", body: "When the last form is signed, Home shows your week and Clients shows only your students." },
        ]}
      />
      <Notice error={error} notice={notice} />

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {packets.map((packet, index) => (
          <li key={packet.id}>
            <Link
              href={`/onboarding?fill=${packet.key}`}
              className={`block rounded-xl border p-4 ${open?.id === packet.id ? "border-accent bg-accent/5" : "border-ink/10 bg-white"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
                {packet.done ? "Done" : `Step ${index + 1}`}
              </p>
              <p className="mt-1 font-medium">{packet.title}</p>
            </Link>
          </li>
        ))}
      </ol>

      {packets.length === 0 ? (
        <p className="panel mt-8 rounded-xl p-6 text-ink/65">
          Coach forms have not been published yet. Ask a program manager to add them.
        </p>
      ) : null}

      {gate === "ready" ? (
        <Link href="/workspace" className="btn mt-8">
          Open coach workspace
        </Link>
      ) : null}

      {open && gate !== "ready" ? (
        <div className="mt-8 max-w-2xl">
          <PacketCard packet={open} action="/api/onboarding" hidden={{}} signerPlaceholder={user.name} />
          {open.done && remaining[0] ? (
            <Link href={`/onboarding?fill=${remaining[0].key}`} className="btn mt-4">
              Continue to {remaining[0].title}
            </Link>
          ) : null}
        </div>
      ) : null}

      {gate === "ready" ? (
        <div className="mt-8 max-w-2xl space-y-4">
          {packets.map((packet) => (
            <PacketCard key={packet.id} packet={packet} action="/api/onboarding" hidden={{}} signerPlaceholder={user.name} />
          ))}
        </div>
      ) : null}
    </Shell>
  );
}
