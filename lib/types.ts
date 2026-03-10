/** プロキシプロトコルの種類 */
export type ProxyScheme = "http" | "https" | "socks4" | "socks5"

/** プロキシモードの種類 */
export type ProxyType = "direct" | "fixed_servers" | "pac_script" | "system"

/** プロキシ認証情報 */
export interface ProxyAuth {
  username: string
  password: string
}

/** 固定プロキシサーバー設定 */
export interface FixedServerConfig {
  scheme: ProxyScheme
  host: string
  port: number
  auth?: ProxyAuth
}

/** PAC スクリプト設定 */
export interface PacScriptConfig {
  url?: string
  data?: string
  mandatory?: boolean
}

/** プロキシ設定 */
export interface ProxyConfig {
  singleProxy?: FixedServerConfig
  proxyForHttp?: FixedServerConfig
  proxyForHttps?: FixedServerConfig
  proxyForFtp?: FixedServerConfig
  fallbackProxy?: FixedServerConfig
  pacScript?: PacScriptConfig
}

/** プロファイルで使える色 */
export const PROFILE_COLORS = [
  "#4CAF50", // green
  "#2196F3", // blue
  "#FFC107", // amber
  "#F44336", // red
  "#9C27B0", // purple
  "#607D8B", // blue-grey
  "#FF9800", // orange
  "#00BCD4" // cyan
] as const

/** プロキシプロファイル */
export interface ProxyProfile {
  id: string
  name: string
  color: string
  type: ProxyType
  config: ProxyConfig
  bypassList: string[]
  createdAt: number
  updatedAt: number
}

/** プロキシエラー情報 */
export interface ProxyError {
  message: string
  fatal: boolean
  timestamp: number
}

/** アプリケーション全体の状態 */
export interface AppState {
  activeProfileId: string | null
  profiles: ProxyProfile[]
  lastError: ProxyError | null
}

/** デフォルトのバイパスリスト */
export const DEFAULT_BYPASS_LIST = [
  "localhost",
  "127.0.0.1",
  "::1",
  "<local>"
]
