export const PORTFOLIO_LEVELS = {
  international: "International",
  national: "National",
  state: "State / provincial",
  regional: "Regional / district",
  school: "School",
  personal: "Personal / community",
} as const;

export type PortfolioLevel = keyof typeof PORTFOLIO_LEVELS;

export const PORTFOLIO_CATEGORIES = {
  award: "Award or honor",
  activity: "Activity or club",
  leadership: "Leadership role",
  service: "Service / volunteering",
  work: "Job or internship",
  academic: "Academic / research",
  arts: "Arts or performance",
  athletics: "Athletics",
} as const;

export const GRADE_YEARS = { 9: "Freshman (9)", 10: "Sophomore (10)", 11: "Junior (11)", 12: "Senior (12)" } as const;

const LEVEL_RULES: Array<[PortfolioLevel, RegExp]> = [
  ["international", /\b(international|world|global|worldwide)\b/i],
  ["national", /\b(national|nationwide|usa|u\.s\.)\b/i],
  ["state", /\b(state|all-state|statewide|governor|province|provincial)\b/i],
  ["regional", /\b(regional|region|district|county|sectional|conference|city|metro|area)\b/i],
  ["international", /\b(olympiad|imo|isef)\b/i],
  ["national", /\b(american|national merit|scholastic art|usamo|amc 12|ap scholar)\b/i],
  ["school", /\b(school|class|honor roll|club|varsity|jv|homeroom|department|principal)\b/i],
];

/** Keyword-based level suggestion; students and coaches can always override it. */
export function suggestLevel(title: string, description = ""): PortfolioLevel {
  const text = `${title} ${description}`;
  for (const [level, pattern] of LEVEL_RULES) {
    if (pattern.test(text)) return level;
  }
  return "personal";
}

export function suggestCategory(title: string, description = ""): keyof typeof PORTFOLIO_CATEGORIES {
  const text = `${title} ${description}`.toLowerCase();
  if (/(award|prize|winner|won|finalist|honor|medal|scholar|recognition|place)/.test(text)) return "award";
  if (/(president|captain|founder|lead|chair|head|officer)/.test(text)) return "leadership";
  if (/(volunteer|service|tutor|fundrais|community)/.test(text)) return "service";
  if (/(intern|job|employ|work)/.test(text)) return "work";
  if (/(research|paper|science fair|lab|publication)/.test(text)) return "academic";
  if (/(band|choir|orchestra|theater|theatre|art|dance|film|music)/.test(text)) return "arts";
  if (/(team|varsity|soccer|basketball|track|swim|tennis|football|baseball)/.test(text)) return "athletics";
  return "activity";
}

export const LEVEL_ORDER: PortfolioLevel[] = ["international", "national", "state", "regional", "school", "personal"];
