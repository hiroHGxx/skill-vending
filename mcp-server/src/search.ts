import type { CatalogSkill } from "./catalog.js";

export interface SearchResult {
  skill: CatalogSkill;
  score: number;
}

/**
 * name / description / tags に対する部分一致の簡易スコアリング検索。
 * クエリを空白で分割し、各語について:
 *   name に含まれる … +3点 / tags に含まれる … +2点 / description に含まれる … +2点
 */
export function searchSkills(
  skills: CatalogSkill[],
  query: string
): SearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/[\s、,]+/)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  for (const skill of skills) {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const tags = (skill.tags ?? []).map((t) => t.toLowerCase());

    let score = 0;
    for (const term of terms) {
      if (name.includes(term)) score += 3;
      if (tags.some((tag) => tag.includes(term))) score += 2;
      if (description.includes(term)) score += 2;
    }
    if (score > 0) results.push({ skill, score });
  }
  return results.sort((a, b) => b.score - a.score);
}
