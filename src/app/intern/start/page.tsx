import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PacketCard } from "@/components/access-packet";
import { Guide } from "@/components/guide";
import { Notice, Shell } from "@/components/shell";
import { internClearance, internRecord, parentInterns } from "@/lib/gate";

export default async function InternStartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; internId?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "intern" && user.role !== "intern_parent") redirect("/workspace");

  const { error, notice, internId } = await searchParams;

  if (user.role === "intern") {
    const intern = await internRecord(user);
    if (!intern) {
      return (
        <Shell user={user}>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Intern account not linked</h1>
          <p className="mt-3 text-ink/65">Ask a manager to connect this login to an intern record.</p>
        </Shell>
      );
    }
    const clearance = await internClearance(intern.id);
    return (
      <Shell user={user}>
        <p className="label-caps text-accent">Teen intern</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          {clearance.ready ? "You're in" : "Sign your forms to open the intern workspace"}
        </h1>
        <p className="mt-3 max-w-2xl text-ink/65">
          {clearance.ready
            ? `${intern.team.name} is open. Use Home for the teams, Team chat to write, and Documents to share a note.`
            : "Team chat stays closed until you and your parent have both signed. This space is for intern teams. It does not include coaching notes."}
        </p>
        <Guide
          steps={[
            { title: "You sign", body: "Read each agreement below, tick the box, and type your name." },
            { title: "A parent signs", body: `${intern.parentName} signs in with ${intern.parentEmail} and completes the parent forms.` },
            { title: "The sidebar changes", body: "Home, Team chat, and Documents appear. Your team's channel is private. Between teams is shared." },
          ]}
        />
        <Notice error={error} notice={notice} />
        <StatusRow internDone={clearance.internDone} parentDone={clearance.parentDone} />
        {clearance.ready ? (
          <Link href="/intern" className="btn mt-8">
            Open intern workspace
          </Link>
        ) : (
          <div className="mt-8 max-w-2xl space-y-4">
            {clearance.internPackets.map((packet) => (
              <PacketCard
                key={packet.id}
                packet={packet}
                action="/api/interns"
                hidden={{ intent: "sign", internId: intern.id }}
                signerPlaceholder={user.name}
              />
            ))}
            {!clearance.parentDone ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                {clearance.internDone
                  ? `${intern.parentName} still needs to sign. They sign in with ${intern.parentEmail}.`
                  : `After you sign, ${intern.parentName} signs at the parent login (${intern.parentEmail}).`}
              </p>
            ) : null}
          </div>
        )}
      </Shell>
    );
  }

  const interns = await parentInterns(user);
  const selected = interns.find((intern) => intern.id === internId) ?? interns[0];

  return (
    <Shell user={user}>
      <p className="label-caps text-accent">Parent</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Sign your teen&apos;s intern forms</h1>
      <p className="mt-3 max-w-2xl text-ink/65">
        Your signature lets your teen into team chat and shared documents. You can see whether both of you have signed.
        The chat itself is for interns and managers.
      </p>
      <Guide
        steps={[
          { title: "Read the permission", body: "Each form explains what the intern team can see and what stays out of coaching." },
          { title: "Sign with your name", body: "Tick the box and type your full name. That is the signature on file." },
          { title: "Tell your teen", body: "When both badges say signed, they sign in again and the intern workspace opens." },
        ]}
      />
      <Notice error={error} notice={notice} />
      {interns.length === 0 ? (
        <p className="panel mt-8 rounded-xl p-6 text-ink/65">No intern is linked to this email yet.</p>
      ) : null}
      {selected ? (
        <ParentPacket intern={selected} showPicker={interns.length > 1} interns={interns} signerPlaceholder={user.name} />
      ) : null}
    </Shell>
  );
}

function StatusRow({ internDone, parentDone }: { internDone: boolean; parentDone: boolean }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      <span className={`rounded-full px-3 py-1 ${internDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        Intern {internDone ? "signed" : "still signing"}
      </span>
      <span className={`rounded-full px-3 py-1 ${parentDone ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        Parent {parentDone ? "signed" : "still signing"}
      </span>
    </div>
  );
}

async function ParentPacket({
  intern,
  showPicker,
  interns,
  signerPlaceholder,
}: {
  intern: { id: string; firstName: string; lastName: string; email: string; team: { name: string } };
  showPicker: boolean;
  interns: Array<{ id: string; firstName: string; lastName: string }>;
  signerPlaceholder: string;
}) {
  const clearance = await internClearance(intern.id);
  return (
    <div className="mt-8 max-w-2xl">
      {showPicker ? (
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-medium">
            Teen
            <select name="internId" defaultValue={intern.id} className="field min-w-64">
              {interns.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.firstName} {row.lastName}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-secondary">Show</button>
        </form>
      ) : null}
      <p className="text-sm text-ink/60">
        {intern.firstName} {intern.lastName} · {intern.team.name}
      </p>
      <StatusRow internDone={clearance.internDone} parentDone={clearance.parentDone} />
      {!clearance.internDone ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {intern.firstName} still needs to sign. They sign in with {intern.email}. You can sign your forms now; the
          workspace opens after both of you are done.
        </p>
      ) : null}
      <div className="mt-6 space-y-4">
        {clearance.parentPackets.map((packet) => (
          <PacketCard
            key={packet.id}
            packet={packet}
            action="/api/interns"
            hidden={{ intent: "sign", internId: intern.id }}
            signerPlaceholder={signerPlaceholder}
          />
        ))}
      </div>
      {clearance.ready ? (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {intern.firstName} can sign in and use the intern workspace.
        </p>
      ) : null}
    </div>
  );
}
