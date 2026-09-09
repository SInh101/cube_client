# Rubik's Cube Learning Client

GitHub Pagesだけで動作する、クライアントサイドのルービックキューブ学習ツールです。

## 機能

- Three.jsによる3Dキューブと各ムーブのアニメーション
- 外面およびM/E/S中段回転の操作盤
- 手順入力、リセット、順再生、逆再生、ステップ再生
- コミュテーター教材
- 3-cycle、ステッカー移動、共役操作の解析と可視化
- アニメーション速度の調整
- `localStorage`によるプリセット保存

REST風の境界はブラウザ内のローカルAPIとして維持しています。外部API、データベース、環境変数、secret keyは必要ありません。ページを再読み込みするとキューブの状態は初期化されますが、プリセットは同じブラウザに保存されます。

## 必要環境

- Node.js 20.19以上（Node.js 22または24を推奨）
- npm 10以上

## ローカル実行

```bash
npm install
npm run dev
```

Viteが表示したローカルURLをブラウザで開いてください。

## 検証と本番ビルド

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

生成物は `apps/web/dist` に出力されます。

## GitHub Pages

1. このリポジトリをGitHubへpushします。
2. GitHubの `Settings > Pages` で、Sourceを `GitHub Actions` に設定します。
3. `main` ブランチへpushすると `.github/workflows/pages.yml` がビルドと公開を実行します。

リポジトリ名はViteの公開パスへ自動反映されるため、任意の名前を使用できます。カスタムドメインは必須ではありません。

## セキュリティ

- アプリケーションに認証情報や外部サービスのキーは含まれていません。
- `.env` 系ファイルはGit管理対象外です。
- ブラウザの保存内容はプリセットだけです。機密情報をプリセット名や手順へ入力しないでください。
