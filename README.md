# skill-vending

Agent Skills（Claude のスキル）を配布する**読み取り専用 MCP サーバー**の個人実験プロジェクトです。

Claude Code にこの MCP サーバーを繋ぐと、会話の中でスキルを探して導入できます：

> 「議事録系の便利スキルない？」→ 検索 → 内容確認 → `~/.claude/skills/` へインストール

## ⚠️ 免責事項（必ずお読みください）

- 本プロジェクトは**個人の実験**であり、動作・安全性の保証はありません。**自己責任**でご利用ください
- 業務データを扱う環境で使う場合は、**所属組織のポリシーを確認**してください
- 配布するスキルは指示書（Markdown）のみで構成され、**実行スクリプトは含みません**
- スキルの内容は、インストール前に `get_skill` の返り値で**全文確認できます**
- MCP サーバーは読み取り専用です。ファイル書き込み・コマンド実行系のツールは一切持ちません

## アーキテクチャ

```
[GitHubリポジトリ] ← 一次配布元（倉庫）
   ├── skills/           … スキル本体（SKILL.md形式）
   ├── catalog.json      … スキル一覧メタデータ（MCPが読む）
   ├── mcp-server/       … MCPサーバー実装（TypeScript / stdio）
   └── docs/             … GitHub Pages用の紹介ページ

[独自ドメイン] ← 入口（店構え）
   └── GitHub Pagesにサブドメインを割当
```

設計原則：**MCP サーバーは GitHub を読むだけ（read-only）**。配布物の実体と更新履歴はすべて GitHub 側に集約しています。スキルデータは常に main ブランチの raw URL から取得するため、サーバーの再インストールなしで最新のカタログが反映されます。

## 導入手順

前提：Node.js 18 以上、Claude Code。

### 方法1：CLI で追加

```bash
claude mcp add skill-vending -- npx -y github:hiroHGxx/skill-vending
```

### 方法2：`.mcp.json` に記載

プロジェクトの `.mcp.json`（または `~/.claude.json` の該当箇所）に追加：

```json
{
  "mcpServers": {
    "skill-vending": {
      "command": "npx",
      "args": ["-y", "github:hiroHGxx/skill-vending"]
    }
  }
}
```

> 初回起動時は git clone とビルドが走るため、少し時間がかかります。

## 提供ツール（4つのみ）

| ツール | 引数 | 内容 |
|--------|------|------|
| `list_skills` | なし | catalog.json の内容（name / description / version / タグ） |
| `search_skills` | `query` | name・description・タグへの部分一致検索（簡易スコアリング） |
| `get_skill` | `name` | スキルの全ファイル内容＋インストール手順テキスト |
| `whats_new` | なし | 更新履歴（CHANGELOG.md）。新スキルの追加・改版を確認できます |

`get_skill` はファイル内容を**返すだけ**です。`~/.claude/skills/<name>/` への保存は、クライアント側の Claude がユーザーの承認フローのもとで行います。

> 💡 インストール時に Claude が「ファイルを作成」する操作が見えますが、これはスキルを新規に作っているのではなく、`get_skill` が返した配布物の内容をそのまま書き写しています（サーバーに書き込み権限を持たせない代わりに、保存をユーザーが承認できる操作にするための設計です）。配布元と同一かどうかは `diff -r` でリポジトリの `skills/<name>/` と比較すれば確認できます。

## デモシナリオ

Claude Code 上で以下のように話しかけます：

1. 「議事録系の便利スキルない？」
   → Claude が `search_skills` を呼び、`minutes-to-weekly-report` が見つかる
2. 「内容を見せて」
   → `get_skill` でスキル全文が表示される（インストール前に内容確認）
3. 「インストールして」
   → Claude が `~/.claude/skills/minutes-to-weekly-report/` にファイルを保存（要承認）
4. 新しいセッションで「この議事録からアクションアイテムを抽出して週報にして」
   → スキルがトリガーされ、抽出ルール・週報テンプレートに沿った出力が得られる

## 収録スキル

| スキル | 説明 |
|--------|------|
| `minutes-to-weekly-report` | 議事録からアクションアイテム（担当者・期限・内容）を抽出し、日本のビジネス慣行に沿った週報形式に変換 |
| `japanese-business-email` | 日本式の敬語・構成ルールでビジネスメールを作成（依頼・お詫び・催促・お礼・報告・お断りの類型別対応） |
| `natural-japanese-polish` | AI生成文特有の言い回し・構成の癖を除去し、自然な日本語に推敲（意味と事実は変えない） |

最新の一覧は [`catalog.json`](./catalog.json) を参照してください。

## 開発

```bash
npm install        # ビルドも自動で走ります（prepare）
npm run build      # 手動ビルド

# GitHubにpushする前のローカル動作確認（ローカルのリポジトリからスキルを読む）
SKILL_VENDING_LOCAL_ROOT=$(pwd) node mcp-server/dist/index.js
```

環境変数：

| 変数 | 用途 |
|------|------|
| `SKILL_VENDING_REPO` | 参照先リポジトリ（`owner/repo` 形式）。既定は `mcp-server/src/config.ts` の `DEFAULT_REPO` |
| `SKILL_VENDING_BRANCH` | 参照ブランチ（既定: `main`） |
| `SKILL_VENDING_LOCAL_ROOT` | 開発用。指定するとローカルファイルから読む |

### Phase 2 への布石

catalog 取得・スキル取得のロジック（`catalog.ts` / `search.ts` / `server.ts`）はトランスポート層（`index.ts`）と分離してあります。リモート MCP 化する際は `createServer()` を HTTP 系トランスポートに接続するだけで済む構造です。

## 更新管理（運用ルール）

スキルを更新するときは：

1. `skills/<name>/` 配下のファイルを編集
2. `catalog.json` の該当スキルの `version` を上げ、`updated` を更新
3. `CHANGELOG.md` に1行追記
4. main に push（MCP サーバーは常に main を参照するため、これだけで配信されます）

## 紹介ページ

https://skills.monolb.com/ （GitHub Pages / `docs/` 配下）

設定内容（他プロジェクトで再現する場合の手順）：

1. GitHub リポジトリの Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/docs` に設定
2. 独自ドメインを使う場合：
   - `docs/CNAME` に割り当てたいサブドメイン（例：`skills.example.com`）を1行だけ書く
   - DNS 側で、そのサブドメインの **CNAME レコード**を `<owner>.github.io` に向ける
   - Settings → Pages の Custom domain が DNS check successful になったら「Enforce HTTPS」を有効化

## ライセンス

[MIT](./LICENSE)
