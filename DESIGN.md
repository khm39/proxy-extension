# Chrome Proxy Extension — 設計ドキュメント

## 1. 概要

Chrome ブラウザのプロキシ設定を管理するための拡張機能。
Manifest V3 に準拠し、`chrome.proxy` API を使用してプロキシの設定・切り替えを行う。

## 2. 機能要件

### 2.1 基本機能

| # | 機能 | 説明 |
|---|------|------|
| F1 | プロキシ設定 | HTTP / HTTPS / SOCKS4 / SOCKS5 プロキシサーバーの設定 |
| F2 | ON/OFF 切り替え | ワンクリックでプロキシの有効/無効を切り替え |
| F3 | プロファイル管理 | 複数のプロキシ設定をプロファイルとして保存・切り替え |
| F4 | バイパスリスト | 特定のドメイン・IP アドレスをプロキシから除外 |
| F5 | プロキシ認証 | ユーザー名/パスワードによるプロキシ認証 |
| F6 | PAC スクリプト | PAC (Proxy Auto-Config) URL またはカスタムスクリプトによる高度なルーティング |

### 2.2 UI 機能

| # | 機能 | 説明 |
|---|------|------|
| U1 | ポップアップ | ツールバーアイコンからのクイック操作パネル |
| U2 | オプションページ | プロファイルの詳細設定・管理画面 |
| U3 | ステータス表示 | 現在のプロキシ状態をアイコンバッジで表示 |
| U4 | インポート/エクスポート | プロファイル設定の JSON インポート/エクスポート |

## 3. アーキテクチャ

### 3.1 Manifest V3 構成

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Popup UI   │   │  Options UI  │   │   Service     │ │
│  │  (popup.html │   │ (options.html│   │   Worker      │ │
│  │   popup.js)  │   │  options.js) │   │ (background/  │ │
│  └──────┬───────┘   └──────┬───────┘   │  service-     │ │
│         │                  │           │  worker.js)   │ │
│         │    chrome.runtime.sendMessage │               │ │
│         └──────────────────┼───────────►               │ │
│                            └───────────►               │ │
│                                         │               │ │
│                            ┌────────────┤               │ │
│                            │            │               │ │
│                            ▼            │               │ │
│                    ┌──────────────┐     │               │ │
│                    │ chrome.      │     │               │ │
│                    │ storage.local│     │               │ │
│                    └──────────────┘     │               │ │
│                                         │               │ │
│                            ┌────────────┤               │ │
│                            ▼            └──────────────┘ │
│                    ┌──────────────┐                       │
│                    │ chrome.proxy │                       │
│                    │   .settings  │                       │
│                    └──────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### 3.2 コンポーネント概要

#### Service Worker (background/service-worker.js)
拡張機能のコアロジック。以下を担当:
- `chrome.proxy.settings` API を使ったプロキシの設定・解除
- `chrome.webRequest.onAuthRequired` によるプロキシ認証の処理
- `chrome.storage.local` を使ったプロファイルデータの永続化
- アイコンバッジの更新
- Popup / Options ページからのメッセージハンドリング

#### Popup UI (popup/)
ツールバーアイコンクリック時に表示されるパネル:
- 現在のプロキシ状態の表示（ON/OFF）
- プロファイルの選択・切り替え
- クイック ON/OFF トグル

#### Options Page (options/)
詳細設定を行う画面:
- プロファイルの作成・編集・削除
- プロキシサーバー情報の入力（ホスト、ポート、プロトコル）
- バイパスリストの編集
- PAC スクリプトの入力
- 設定のインポート/エクスポート

### 3.3 データモデル

```typescript
// プロキシプロファイル
interface ProxyProfile {
  id: string;            // UUID
  name: string;          // 表示名
  color: string;         // アイコンバッジの色
  type: ProxyType;       // プロキシの種類
  config: ProxyConfig;   // プロキシ設定
  bypassList: string[];  // バイパスリスト
  createdAt: number;     // 作成日時 (Unix timestamp)
  updatedAt: number;     // 更新日時 (Unix timestamp)
}

// プロキシの種類
type ProxyType = 'direct' | 'fixed_servers' | 'pac_script' | 'system';

// プロキシ設定 (fixed_servers の場合)
interface FixedServerConfig {
  scheme: 'http' | 'https' | 'socks4' | 'socks5';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

// プロキシ設定 (pac_script の場合)
interface PacScriptConfig {
  url?: string;          // PAC ファイルの URL
  data?: string;         // インライン PAC スクリプト
}

// プロキシ設定の共用体型
type ProxyConfig = {
  singleProxy?: FixedServerConfig;     // 全プロトコル共通のプロキシ
  proxyForHttp?: FixedServerConfig;    // HTTP 用プロキシ
  proxyForHttps?: FixedServerConfig;   // HTTPS 用プロキシ
  proxyForFtp?: FixedServerConfig;     // FTP 用プロキシ
  fallbackProxy?: FixedServerConfig;   // フォールバックプロキシ
  pacScript?: PacScriptConfig;         // PAC スクリプト設定
};

// アプリケーション全体の状態
interface AppState {
  activeProfileId: string | null;  // 現在有効なプロファイル ID (null = 直接接続)
  profiles: ProxyProfile[];        // 全プロファイル
}
```

### 3.4 メッセージングプロトコル

Popup / Options ⇔ Service Worker 間の通信は `chrome.runtime.sendMessage` を使用。

```typescript
// メッセージ型定義
type Message =
  | { type: 'GET_STATE' }
  | { type: 'ACTIVATE_PROFILE'; profileId: string }
  | { type: 'DEACTIVATE_PROXY' }
  | { type: 'SAVE_PROFILE'; profile: ProxyProfile }
  | { type: 'DELETE_PROFILE'; profileId: string }
  | { type: 'IMPORT_PROFILES'; profiles: ProxyProfile[] }
  | { type: 'EXPORT_PROFILES' };

// レスポンス型定義
type Response =
  | { success: true; data?: any }
  | { success: false; error: string };
```

## 4. Chrome API 使用

### 4.1 必要な権限 (manifest.json)

```json
{
  "permissions": [
    "proxy",
    "storage",
    "webRequest",
    "webRequestAuthProvider"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

| 権限 | 用途 |
|------|------|
| `proxy` | `chrome.proxy.settings` API でプロキシ設定を制御 |
| `storage` | `chrome.storage.local` でプロファイルデータを永続化 |
| `webRequest` | プロキシ認証リクエストの検出 |
| `webRequestAuthProvider` | `onAuthRequired` でプロキシ認証情報を自動提供 |
| `<all_urls>` (host) | 全 URL に対するプロキシ認証の適用 |

### 4.2 chrome.proxy.settings の使い方

#### 固定プロキシサーバー設定
```javascript
chrome.proxy.settings.set({
  value: {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'http',
        host: '192.168.1.1',
        port: 8080
      },
      bypassList: ['localhost', '127.0.0.1', '*.local']
    }
  },
  scope: 'regular'
});
```

#### PAC スクリプト設定
```javascript
chrome.proxy.settings.set({
  value: {
    mode: 'pac_script',
    pacScript: {
      data: `function FindProxyForURL(url, host) {
        if (shExpMatch(host, "*.example.com")) {
          return "PROXY proxy.example.com:8080";
        }
        return "DIRECT";
      }`
    }
  },
  scope: 'regular'
});
```

#### プロキシ解除（直接接続）
```javascript
chrome.proxy.settings.set({
  value: { mode: 'direct' },
  scope: 'regular'
});
```

### 4.3 プロキシ認証

```javascript
chrome.webRequest.onAuthRequired.addListener(
  (details) => {
    if (details.isProxy) {
      return {
        authCredentials: {
          username: savedUsername,
          password: savedPassword
        }
      };
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
```

> **注意**: Manifest V3 では `blocking` の代わりに `asyncBlocking` を使用する。
> Service Worker から `chrome.webRequest.onAuthRequired.addListener` を使い、
> コールバックで Promise を返す形式にする。

## 5. ディレクトリ構成

```
proxy-extension/
├── manifest.json              # 拡張機能マニフェスト (Manifest V3)
├── background/
│   └── service-worker.js      # Service Worker (コアロジック)
├── popup/
│   ├── popup.html             # ポップアップ HTML
│   ├── popup.js               # ポップアップ JS
│   └── popup.css              # ポップアップ CSS
├── options/
│   ├── options.html           # オプションページ HTML
│   ├── options.js             # オプションページ JS
│   └── options.css            # オプションページ CSS
├── lib/
│   ├── proxy-manager.js       # プロキシ設定ロジック
│   ├── storage-manager.js     # ストレージ操作
│   └── message-types.js       # メッセージ型定数
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── DESIGN.md                  # この設計ドキュメント
└── README.md                  # 使い方・開発ガイド
```

## 6. manifest.json

```json
{
  "manifest_version": 3,
  "name": "Proxy Switcher",
  "version": "1.0.0",
  "description": "プロキシサーバーの設定と切り替えを簡単に行える拡張機能",
  "permissions": [
    "proxy",
    "storage",
    "webRequest",
    "webRequestAuthProvider"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## 7. 主要モジュール設計

### 7.1 ProxyManager (lib/proxy-manager.js)

プロキシ設定の中核ロジックを担当するモジュール。

```
ProxyManager
├── applyProfile(profile)      # プロファイルを適用してプロキシを設定
├── deactivate()               # プロキシを解除（直接接続に戻す）
├── getCurrentSettings()       # 現在のプロキシ設定を取得
├── buildProxyConfig(profile)  # ProxyProfile → chrome.proxy.settings 用の設定に変換
└── setupAuthHandler(profile)  # プロキシ認証ハンドラーの登録
```

### 7.2 StorageManager (lib/storage-manager.js)

`chrome.storage.local` のラッパー。

```
StorageManager
├── getState()                        # AppState 全体を取得
├── saveProfile(profile)              # プロファイルを保存
├── deleteProfile(profileId)          # プロファイルを削除
├── setActiveProfile(profileId|null)  # アクティブプロファイルを設定
├── exportProfiles()                  # プロファイル一覧を JSON で返す
└── importProfiles(profiles)          # JSON からプロファイルをインポート
```

### 7.3 Service Worker (background/service-worker.js)

```
Service Worker
├── onInstalled           # 初回インストール時のデフォルト設定
├── onMessage             # Popup / Options からのメッセージハンドリング
├── onStartup             # ブラウザ起動時にアクティブプロファイルを再適用
└── updateBadge(profile)  # アイコンバッジの更新
```

## 8. UI 設計

### 8.1 ポップアップ (380px × 500px)

```
┌──────────────────────────────────┐
│  🔌 Proxy Switcher         [⚙]  │  ← ヘッダー (⚙ = オプションページ)
├──────────────────────────────────┤
│                                  │
│  ● 直接接続 (プロキシなし)        │  ← ラジオボタンでプロファイル選択
│                                  │
│  ○ 🟢 Work Proxy                │
│     HTTP proxy.company.com:8080  │
│                                  │
│  ○ 🔵 Home VPN                  │
│     SOCKS5 vpn.home.net:1080    │
│                                  │
│  ○ 🟡 Dev Server                │
│     PAC Script                   │
│                                  │
├──────────────────────────────────┤
│  [+ 新規プロファイル]             │  ← クイック追加ボタン
└──────────────────────────────────┘
```

### 8.2 オプションページ

```
┌─────────────────────────────────────────────────────────┐
│  Proxy Switcher — 設定                                   │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ プロファイル │  プロファイル名: [Work Proxy          ]       │
│          │                                              │
│ ● Work   │  色: 🟢🔵🟡🔴🟣⚪                          │
│ ○ Home   │                                              │
│ ○ Dev    │  プロキシタイプ: [固定サーバー ▼]               │
│          │                                              │
│          │  ┌─ サーバー設定 ──────────────────────┐      │
│ [+ 追加]  │  │ スキーム: [HTTP ▼]                  │      │
│          │  │ ホスト:   [proxy.company.com     ]  │      │
│          │  │ ポート:   [8080                  ]  │      │
│ ────────  │  │                                    │      │
│ インポート │  │ □ プロトコル別に設定する             │      │
│ エクスポート│  └──────────────────────────────────┘      │
│          │                                              │
│          │  ┌─ 認証 ─────────────────────────────┐      │
│          │  │ □ 認証を使用する                     │      │
│          │  │ ユーザー名: [                    ]  │      │
│          │  │ パスワード: [                    ]  │      │
│          │  └──────────────────────────────────┘      │
│          │                                              │
│          │  ┌─ バイパスリスト ────────────────────┐      │
│          │  │ localhost                           │      │
│          │  │ 127.0.0.1                           │      │
│          │  │ *.local                             │      │
│          │  │ [+ 追加]                             │      │
│          │  └──────────────────────────────────┘      │
│          │                                              │
│          │        [保存]  [削除]                         │
└──────────┴──────────────────────────────────────────────┘
```

## 9. セキュリティ考慮事項

| 項目 | 対策 |
|------|------|
| プロキシ認証情報の保護 | `chrome.storage.local` に保存。暗号化は Chrome のプロファイル暗号化に依存 |
| PAC スクリプトの安全性 | ユーザー入力の PAC スクリプトはサンドボックス内で実行される (Chrome の仕様) |
| XSS 対策 | Popup / Options の HTML に直接 DOM 操作を行い、`innerHTML` の使用を回避 |
| CSP | Manifest V3 のデフォルト CSP に準拠。インラインスクリプト不使用 |

## 10. 開発方針

- **バニラ JS** で実装（フレームワーク不使用、依存関係ゼロ）
- **ES Modules** を使用（`"type": "module"` in Service Worker）
- **Manifest V3** 準拠
- **Chrome 88+** をサポート対象とする

## 11. 実装フェーズ

### Phase 1: MVP（最小限の動作）
- manifest.json の作成
- Service Worker の基本構造
- ProxyManager による固定プロキシサーバー設定
- StorageManager による永続化
- ポップアップ UI（ON/OFF トグル、プロファイル切り替え）

### Phase 2: 機能拡張
- オプションページ
- PAC スクリプト対応
- プロキシ認証
- バイパスリスト UI
- アイコンバッジ

### Phase 3: ユーティリティ
- インポート/エクスポート
- プロトコル別プロキシ設定
- エラーハンドリングの改善
