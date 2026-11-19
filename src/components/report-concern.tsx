/** "Report a concern": goes straight to the program managers. For teens and parents. */
export function ReportConcern({ clientId, compact = false }: { clientId?: string | null; compact?: boolean }) {
  return (
    <details className={`rounded-xl border border-signal/25 bg-signal/[0.04] ${compact ? "p-3" : "p-4"} text-sm`}>
      <summary className="cursor-pointer font-semibold text-signal">Report a concern</summary>
      <p className="mt-2 text-ink/70">
        Something feel wrong or unsafe, with anyone in Coach Me 2? Tell us here. It goes straight to the program managers,
        not your coach. If someone is in immediate danger, call 911. In the U.S. you can also call or text 988.
      </p>
      <form action="/api/concerns" method="post" className="mt-3 space-y-2">
        <input type="hidden" name="intent" value="report" />
        {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
        <label className="sr-only" htmlFor="concern-body">
          What happened
        </label>
        <textarea id="concern-body" name="body" required rows={3} maxLength={4000} className="field mt-0" placeholder="What happened?" />
        <button className="btn bg-signal px-4 py-2 text-sm hover:bg-signal/90">Send to program managers</button>
      </form>
    </details>
  );
}
