import { LIKERT_LABELS, type FormField } from "@/lib/forms";

export function FormFields({ fields }: { fields: FormField[] }) {
  return (
    <div className="space-y-5">
      {fields.map((field, index) => (
        <fieldset key={field.id} className="space-y-2">
          <legend className="text-sm font-medium">
            {index + 1}. {field.label}
            {field.required === false ? <span className="font-normal text-ink/45"> (optional)</span> : null}
          </legend>
          <FieldInput field={field} />
        </fieldset>
      ))}
    </div>
  );
}

function FieldInput({ field }: { field: FormField }) {
  const required = field.required !== false;

  if (field.type === "likert5") {
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {LIKERT_LABELS.map((label, i) => (
          <label
            key={label}
            className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-ink/[0.12] bg-white px-1 py-2 text-center text-[11px] leading-tight text-ink/65 has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-accent-deep"
          >
            <input type="radio" name={field.id} value={i + 1} required={required} className="sr-only" />
            <span className="text-base font-semibold">{i + 1}</span>
            {label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "scale10" || field.type === "number") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <label
            key={n}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-md border border-ink/[0.12] bg-white text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white"
          >
            <input type="radio" name={field.id} value={n} required={required} className="sr-only" />
            {n}
          </label>
        ))}
        <span className="flex w-full justify-between text-[11px] text-ink/45 sm:w-[27rem]">
          <span>1 = not at all</span>
          <span>10 = completely</span>
        </span>
      </div>
    );
  }

  if (field.type === "choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {(field.options ?? []).map((option) => (
          <label key={option} className="chip">
            <input type="radio" name={field.id} value={option} required={required} />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "text") {
    return <input name={field.id} required={required} className="field mt-0" />;
  }

  return <textarea name={field.id} required={required} rows={3} className="field mt-0" />;
}

export function AnswerList({ fields, answers }: { fields: FormField[]; answers: Record<string, string> }) {
  return (
    <dl className="space-y-2 text-sm">
      {fields.map((field) => {
        const value = answers[field.id] ?? "";
        const shown =
          field.type === "likert5" && value ? `${value} · ${LIKERT_LABELS[Number(value) - 1] ?? ""}` : value || "—";
        return (
          <div key={field.id}>
            <dt className="text-ink/55">{field.label}</dt>
            <dd className="font-medium">{shown}</dd>
          </div>
        );
      })}
    </dl>
  );
}
