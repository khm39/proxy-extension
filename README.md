# Proxy Switcher

Chrome ブラウザのプロキシ設定を管理するための拡張機能。複数のプロキシプロファイルを保存し、ワンクリックで切り替えられます。

## 機能

- **プロキシ設定** — HTTP / HTTPS / SOCKS4 / SOCKS5 プロキシサーバーの設定
- **プロファイル管理** — 複数のプロキシ設定をプロファイルとして保存・切り替え
- **PAC スクリプト** — PAC URL またはカスタムスクリプトによる高度なルーティング
- **プロキシ認証** — ユーザー名/パスワードによる HTTP/HTTPS プロキシ認証
- **バイパスリスト** — 特定のドメイン・IP アドレスをプロキシから除外
- **インポート/エクスポート** — プロファイル設定の JSON インポート/エクスポート
- **開発者モード** — 接続ログの記録と確認

## ディレクトリ構成

```txt
proxy-extension/
├── popup.tsx                  # ポップアップ UI
├── options.tsx                # オプションページ UI
├── style.css                  # 共通 CSS
├── background/
│   ├── index.ts               # Service Worker エントリ
│   └── messages/              # メッセージハンドラー
├── components/                # 共通 React コンポーネント
├── lib/
│   ├── types.ts               # 型定義
│   ├── proxy-manager.ts       # プロキシ設定・認証ロジック
│   ├── storage.ts             # ストレージ操作
│   ├── profile-utils.ts       # プロファイルユーティリティ
│   └── dev-mode-cache.ts      # 開発者モードキャッシュ
├── assets/
│   └── icon.png               # 拡張機能アイコン
└── DESIGN.md                  # 設計ドキュメント
```

## セットアップ

```bash
pnpm install
```

## 開発

```bash
pnpm dev
```

## ビルド

```bash
pnpm build
```

## 必要な権限

| 権限                     | 用途                              |
| ------------------------ | --------------------------------- |
| `proxy`                  | プロキシ設定の制御                |
| `storage`                | プロファイルデータの永続化        |
| `webRequest`             | プロキシ認証リクエストの検出      |
| `webRequestAuthProvider` | プロキシ認証情報の自動提供        |
| `<all_urls>`             | 全 URL に対するプロキシ認証の適用 |
