import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getCatalog, getChangelog, getSkillFiles } from "./catalog.js";
import { searchSkills } from "./search.js";
import { SERVER_NAME, SERVER_VERSION } from "./config.js";

/**
 * ツール定義（トランスポート非依存）。
 * Phase 2 でリモートMCP化する際は、この createServer() を
 * 別のトランスポート（HTTP等）に接続するだけでよい。
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  server.registerTool(
    "list_skills",
    {
      description:
        "配布中の Agent Skills の一覧を返します。各スキルの name / description / version / タグが確認できます。",
      inputSchema: {},
    },
    async () => {
      const catalog = await getCatalog();
      const lines = catalog.skills.map(
        (s) =>
          `- ${s.name} (v${s.version})\n  ${s.description}\n  タグ: ${(s.tags ?? []).join(", ") || "なし"}`
      );
      const text =
        `スキルカタログ（最終更新: ${catalog.updated}／全${catalog.skills.length}件）\n\n` +
        lines.join("\n\n") +
        `\n\nスキルの内容を取得するには get_skill ツールを name 付きで呼び出してください。`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "search_skills",
    {
      description:
        "キーワードでスキルを検索します。name / description / タグに対する部分一致検索です。",
      inputSchema: {
        query: z.string().describe("検索キーワード（空白区切りで複数指定可）"),
      },
    },
    async ({ query }) => {
      const catalog = await getCatalog();
      const results = searchSkills(catalog.skills, query);
      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `「${query}」に一致するスキルは見つかりませんでした。list_skills で全スキルを確認できます。`,
            },
          ],
        };
      }
      const lines = results.map(
        (r, i) =>
          `${i + 1}. ${r.skill.name} (v${r.skill.version}, スコア: ${r.score})\n   ${r.skill.description}`
      );
      const text =
        `「${query}」の検索結果（${results.length}件）:\n\n` +
        lines.join("\n\n") +
        `\n\nスキルの内容を取得するには get_skill ツールを name 付きで呼び出してください。`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "get_skill",
    {
      description:
        "指定したスキルの全ファイル（SKILL.md と参考資料）とインストール手順を返します。このサーバーはファイルの書き込みを行いません。インストール（ファイル保存）は返り値の手順に従い、ユーザーの承認のもとクライアント側で行ってください。",
      inputSchema: {
        name: z.string().describe("スキル名（list_skills / search_skills で確認できる name）"),
      },
    },
    async ({ name }) => {
      const { skill, files } = await getSkillFiles(name);

      const fileSections = files
        .map(
          (f) =>
            `----- FILE: ${f.path} -----\n${f.content}\n----- END FILE: ${f.path} -----`
        )
        .join("\n\n");

      const installDir = `~/.claude/skills/${skill.name}/`;
      const fileList = files.map((f) => `  - ${installDir}${f.path}`).join("\n");

      const text = `スキル「${skill.name}」 v${skill.version}
${skill.description}

【インストール手順】
以下の各ファイルを、記載の相対パスを保ったまま ${installDir} に保存してください：
${fileList}

- 保存はユーザーの承認のもとで行ってください（このMCPサーバー自身は書き込みを行いません）
- 保存前に、ユーザーが内容を確認できるようファイル一覧と概要を提示してください
- 保存後、スキルは利用可能になります（クライアントによっては新しいセッションの開始が必要な場合があります）

【ファイル内容】

${fileSections}`;

      return { content: [{ type: "text", text }] };
    }
  );

  server.registerTool(
    "whats_new",
    {
      description:
        "スキル配布所の更新履歴（CHANGELOG）を返します。新しいスキルの追加や既存スキルの改版を確認できます。気になる更新があれば get_skill で内容を取得してください。",
      inputSchema: {},
    },
    async () => {
      const changelog = await getChangelog();
      const text =
        changelog.trimEnd() +
        `\n\n各スキルの現在の一覧は list_skills、内容の取得は get_skill を利用してください。`;
      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}
