import { FormFields } from "@/components/form-fields";
import { parseFields } from "@/lib/forms";
import type { PacketView } from "@/lib/gate";

export function PacketCard({
  packet,
  action,
  hidden,
  signerPlaceholder,
}: {
  packet: PacketView;
  action: string;
  hidden: Record<string, string>;
  signerPlaceholder: string;
}) {
  return (
    <article className="panel rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{packet.title}</h2>
          {packet.description ? <p className="mt-2 max-w-2xl text-sm text-ink/60">{packet.description}</p> : null}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            packet.done ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {packet.done ? "Done" : "Needs you"}
        </span>
      </div>

      {packet.done ? (
        <p className="mt-4 text-sm text-ink/60">
          Signed by <span className="font-medium text-ink">{packet.signerName}</span>
          {packet.completedAt ? ` on ${packet.completedAt.toLocaleDateString()}` : ""}. Version {packet.version}.
        </p>
      ) : (
        <form action={action} method="post" className="mt-5 space-y-5">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input type="hidden" name="packetId" value={packet.id} />
          {packet.kind === "signature" ? (
            <>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-paper/70 p-4 text-sm leading-relaxed text-ink/80">
                {packet.body}
              </div>
              <p className="text-sm text-ink/55">Read it through, tick the box, then type your name. That name is the signature.</p>
            </>
          ) : (
            <>
              <FormFields fields={parseFields(packet.schemaJson)} />
              <p className="text-sm text-ink/55">Answer each question, confirm they are accurate, then type your name.</p>
            </>
          )}
          {packet.kind === "signature" ? (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="agree" value="1" required className="mt-1" />I have read this and agree.
            </label>
          ) : (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="agree" value="1" required className="mt-1" />
              The answers above are accurate.
            </label>
          )}
          <label className="block text-sm font-medium">
            Type your full name to sign
            <input
              name="signature"
              required
              minLength={3}
              placeholder={signerPlaceholder}
              className="field max-w-sm font-display text-lg"
            />
          </label>
          <button className="btn">Submit</button>
        </form>
      )}
    </article>
  );
}
