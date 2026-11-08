export function Guide({ steps }: { steps: Array<{ title: string; body: string }> }) {
  return (
    <ol className="mt-6 grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="rounded-xl border border-ink/10 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Step {index + 1}</p>
          <p className="mt-1 font-medium">{step.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
