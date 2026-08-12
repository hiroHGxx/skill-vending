import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRANCH, CATALOG_CACHE_TTL_MS, LOCAL_ROOT, REPO } from "./config.js";

export interface CatalogSkill {
  name: string;
  description: string;
  version: string;
  files: string[];
  tags?: string[];
}

export interface Catalog {
  updated: string;
  skills: CatalogSkill[];
}

export interface SkillFile {
  path: string;
  content: string;
}

/**
 * リポジトリ内の相対パスからテキストを取得する。
 * 通常は GitHub の raw URL（常に最新の main ブランチ）、
 * SKILL_VENDING_LOCAL_ROOT 指定時のみローカルから読む（開発用・読み取りのみ）。
 */
async function fetchText(repoPath: string): Promise<string> {
  if (LOCAL_ROOT) {
    return readFile(join(LOCAL_ROOT, repoPath), "utf8");
  }
  const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${repoPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `取得に失敗しました（HTTP ${res.status}）: ${url}\n` +
        `リポジトリ設定（${REPO} / ${BRANCH}）が正しいか確認してください。`
    );
  }
  return res.text();
}

let cache: { catalog: Catalog; fetchedAt: number } | undefined;

export async function getCatalog(): Promise<Catalog> {
  if (cache && Date.now() - cache.fetchedAt < CATALOG_CACHE_TTL_MS) {
    return cache.catalog;
  }
  const raw = await fetchText("catalog.json");
  const catalog = JSON.parse(raw) as Catalog;
  if (!Array.isArray(catalog.skills)) {
    throw new Error("catalog.json の形式が不正です（skills 配列がありません）");
  }
  cache = { catalog, fetchedAt: Date.now() };
  return catalog;
}

/** スキル名・ファイルパスとして安全な文字列か検証する（パストラバーサル防止） */
function assertSafeRelativePath(p: string): void {
  if (p.includes("..") || p.startsWith("/") || p.includes("\\")) {
    throw new Error(`不正なパスが含まれています: ${p}`);
  }
}

export async function getSkillFiles(
  name: string
): Promise<{ skill: CatalogSkill; files: SkillFile[] }> {
  const catalog = await getCatalog();
  const skill = catalog.skills.find((s) => s.name === name);
  if (!skill) {
    const available = catalog.skills.map((s) => s.name).join(", ");
    throw new Error(
      `スキル「${name}」は見つかりません。利用可能なスキル: ${available}`
    );
  }
  assertSafeRelativePath(skill.name);

  const files: SkillFile[] = [];
  for (const file of skill.files) {
    assertSafeRelativePath(file);
    const repoPath = `skills/${skill.name}/${file}`;
    const content = await fetchText(repoPath);
    files.push({ path: file, content });
  }
  return { skill, files };
}
