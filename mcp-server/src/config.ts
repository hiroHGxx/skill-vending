/**
 * 配布元リポジトリの設定。
 *
 * DEFAULT_REPO は GitHub に push する前に自分の "owner/repo" に書き換えること。
 * 環境変数でも上書きできる：
 *   SKILL_VENDING_REPO       … "owner/repo" 形式
 *   SKILL_VENDING_BRANCH     … 参照ブランチ（既定: main）
 *   SKILL_VENDING_LOCAL_ROOT … 開発用。指定するとGitHubではなくローカルのリポジトリ
 *                              ルートからファイルを読む（読み取りのみ）
 */
export const DEFAULT_REPO = "hiroHGxx/skill-vending";

export const REPO = process.env.SKILL_VENDING_REPO ?? DEFAULT_REPO;
export const BRANCH = process.env.SKILL_VENDING_BRANCH ?? "main";
export const LOCAL_ROOT = process.env.SKILL_VENDING_LOCAL_ROOT;

export const SERVER_NAME = "skill-vending";
export const SERVER_VERSION = "0.1.0";

/** catalog.json のメモリキャッシュ有効期間（ミリ秒） */
export const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
