export type FieldType = "likert5" | "scale10" | "number" | "text" | "longtext" | "choice";

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  metric?: "wellbeing" | "fulfillment";
  required?: boolean;
};

export const FIELD_TYPES: Record<FieldType, string> = {
  likert5: "Agree scale (1 strongly disagree – 5 strongly agree)",
  scale10: "Rating 1–10",
  number: "Number",
  text: "Short answer",
  longtext: "Long answer",
  choice: "Multiple choice",
};

export const LIKERT_LABELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];

export const FORM_STAGES = {
  intake: "Intake",
  pre: "Pre-coaching",
  mid: "Mid-coaching",
  post: "Post-coaching",
  session: "Before each session",
  scribe: "AI scribe note form",
  parent: "Parent update",
} as const;

export const FORM_AUDIENCES = {
  client: "Student fills out",
  coach: "Coach fills out",
  scribe: "AI scribe fills out",
} as const;

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function parseFields(schemaJson: string): FormField[] {
  try {
    const raw = JSON.parse(schemaJson) as Array<Partial<FormField>>;
    return raw
      .filter((f) => f && f.id && f.label)
      .map((f) => ({
        id: String(f.id),
        label: String(f.label),
        type: (f.type && f.type in FIELD_TYPES ? f.type : "text") as FieldType,
        options: f.options,
        metric: f.metric,
        required: f.required ?? true,
      }));
  } catch {
    return [];
  }
}

/**
 * One question per line: `type | question | options`.
 * Add `[wellbeing]` or `[fulfillment]` at the end of a scale question to feed the metrics charts,
 * and `?` at the start of the question to make it optional.
 */
export function parseFieldSpec(spec: string): { fields: FormField[]; errors: string[] } {
  const fields: FormField[] = [];
  const errors: string[] = [];
  const used = new Set<string>();

  spec
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line, index) => {
      const parts = line.split("|").map((p) => p.trim());
      let type = parts[0] as FieldType;
      let label = parts[1] ?? "";
      if (parts.length === 1) {
        type = "text";
        label = parts[0];
      }
      if (!(type in FIELD_TYPES)) {
        errors.push(`Line ${index + 1}: unknown type "${parts[0]}"`);
        return;
      }
      let metric: FormField["metric"];
      const tag = label.match(/\[(wellbeing|fulfillment)\]\s*$/i);
      if (tag) {
        metric = tag[1].toLowerCase() as FormField["metric"];
        label = label.slice(0, tag.index).trim();
      }
      let required = true;
      if (label.startsWith("?")) {
        required = false;
        label = label.slice(1).trim();
      }
      if (!label) {
        errors.push(`Line ${index + 1}: question text is missing`);
        return;
      }
      const options =
        type === "choice"
          ? (parts[2] ?? "")
              .split(";")
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined;
      if (type === "choice" && (!options || options.length < 2)) {
        errors.push(`Line ${index + 1}: multiple choice needs at least two options separated by ;`);
        return;
      }
      let id = slug(label) || `q${index + 1}`;
      while (used.has(id)) id = `${id}_${index + 1}`;
      used.add(id);
      fields.push({ id, label, type, options, metric, required });
    });

  if (fields.length === 0 && errors.length === 0) errors.push("Add at least one question");
  return { fields, errors };
}

export function fieldsToSpec(fields: FormField[]) {
  return fields
    .map((f) => {
      const label = `${f.required === false ? "? " : ""}${f.label}${f.metric ? ` [${f.metric}]` : ""}`;
      return f.type === "choice"
        ? `${f.type} | ${label} | ${(f.options ?? []).join("; ")}`
        : `${f.type} | ${label}`;
    })
    .join("\n");
}

/** Normalises a numeric answer to a 0–10 scale so different question types can be compared. */
export function toTenPoint(field: FormField, value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || value === "") return null;
  if (field.type === "likert5") return ((n - 1) / 4) * 10;
  if (field.type === "scale10" || field.type === "number") return n;
  return null;
}

export function metricScores(fields: FormField[], answers: Record<string, string>) {
  const buckets: Record<"wellbeing" | "fulfillment", number[]> = { wellbeing: [], fulfillment: [] };
  for (const field of fields) {
    const metric = field.metric ?? (field.id === "wellbeing" ? "wellbeing" : field.id === "fulfillment" ? "fulfillment" : undefined);
    if (!metric) continue;
    const score = toTenPoint(field, answers[field.id] ?? "");
    if (score !== null) buckets[metric].push(score);
  }
  const avg = (list: number[]) =>
    list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;
  return { wellbeing: avg(buckets.wellbeing), fulfillment: avg(buckets.fulfillment) };
}

export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
