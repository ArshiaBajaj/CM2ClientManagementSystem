/**
 * Draft values inventory built on Schwartz's theory of basic human values
 * (Schwartz, 1992; 2012). The ten values sit on a circle: neighbours are compatible,
 * opposites pull against each other. Item wording here is original and teen-friendly,
 * and should be reviewed by the research team before it is used for research.
 */
export const VALUES = [
  {
    key: "self_direction",
    name: "Independence",
    theory: "Self-direction",
    statement: "Thinking for myself and making my own choices",
    prompt: "Describe a time you chose your own path even when it was easier to follow others.",
  },
  {
    key: "stimulation",
    name: "Adventure",
    theory: "Stimulation",
    statement: "Trying new things and having exciting experiences",
    prompt: "What is the boldest new thing you have tried, and what did it teach you?",
  },
  {
    key: "hedonism",
    name: "Enjoyment",
    theory: "Hedonism",
    statement: "Having fun and enjoying life",
    prompt: "What activity makes you lose track of time, and why does it matter to you?",
  },
  {
    key: "achievement",
    name: "Achievement",
    theory: "Achievement",
    statement: "Being successful and showing what I can do",
    prompt: "Which accomplishment are you proudest of because of the work behind it, not the result?",
  },
  {
    key: "power",
    name: "Influence",
    theory: "Power",
    statement: "Being in charge and having a say in how things go",
    prompt: "When have you taken the lead, and how did you use that responsibility?",
  },
  {
    key: "security",
    name: "Stability",
    theory: "Security",
    statement: "Feeling safe and having things be steady and predictable",
    prompt: "Who or what makes you feel grounded, and how has that shaped you?",
  },
  {
    key: "conformity",
    name: "Responsibility",
    theory: "Conformity",
    statement: "Following through on commitments and respecting rules",
    prompt: "Tell a story about keeping a promise when it was hard to do.",
  },
  {
    key: "tradition",
    name: "Heritage",
    theory: "Tradition",
    statement: "Honouring my family, culture, or faith traditions",
    prompt: "Which tradition from your family or culture means the most to you, and why?",
  },
  {
    key: "benevolence",
    name: "Caring",
    theory: "Benevolence",
    statement: "Being there for the people close to me",
    prompt: "Describe a moment you showed up for someone you care about.",
  },
  {
    key: "universalism",
    name: "Fairness",
    theory: "Universalism",
    statement: "Making the world fairer and protecting people and nature",
    prompt: "What problem in the world do you want to help fix, and what have you already done about it?",
  },
] as const;

export type ValueKey = (typeof VALUES)[number]["key"];

/** 25 pairs: each value appears five times, across neighbours, near-neighbours, and opposites. */
export const VALUE_PAIRS: Array<[number, number]> = (() => {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < 10; i++) pairs.push([i, (i + 1) % 10]);
  for (let i = 0; i < 10; i++) pairs.push([i, (i + 3) % 10]);
  for (let i = 0; i < 5; i++) pairs.push([i, i + 5]);
  return pairs.map(([a, b], index) => (index % 2 === 0 ? [a, b] : [b, a]));
})();

export function scoreValues(choices: Record<number, number>) {
  const scores: Record<string, number> = Object.fromEntries(VALUES.map((v) => [v.key, 0]));
  VALUE_PAIRS.forEach((_, index) => {
    const winner = choices[index];
    if (winner !== undefined && VALUES[winner]) scores[VALUES[winner].key] += 1;
  });
  return scores;
}

export function topValues(scores: Record<string, number>, count = 5) {
  return [...VALUES]
    .map((v, order) => ({ ...v, score: scores[v.key] ?? 0, order }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, count);
}

/** Position on the values circle: x = openness (+) vs conservation (−), y = self-transcendence (+) vs self-enhancement (−). */
export function worldViewPoint(scores: Record<string, number>) {
  const mean = VALUES.reduce((sum, v) => sum + (scores[v.key] ?? 0), 0) / VALUES.length;
  let x = 0;
  let y = 0;
  VALUES.forEach((v, i) => {
    const angle = valueAngle(i);
    const weight = (scores[v.key] ?? 0) - mean;
    x += Math.cos(angle) * weight;
    y += Math.sin(angle) * weight;
  });
  const length = Math.hypot(x, y);
  const scale = length > 0 ? Math.min(1, length / 4) / length : 0;
  return { x: x * scale, y: y * scale };
}

/** Angles chosen so Openness points right and Self-transcendence points up. */
export function valueAngle(index: number) {
  return (-(index * 36 - 18) * Math.PI) / 180;
}

export function worldViewSummary(point: { x: number; y: number }) {
  const horizontal =
    point.x > 0.15 ? "open to change and new experiences" : point.x < -0.15 ? "grounded in stability and tradition" : "balanced between change and stability";
  const vertical =
    point.y > 0.15 ? "focused on caring for others and the wider world" : point.y < -0.15 ? "driven by personal goals and success" : "balanced between your own goals and others' needs";
  return `You lean ${horizontal}, and ${vertical}.`;
}
