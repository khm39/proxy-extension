import type {
  FixedServerConfig,
  ProxyProfile,
  ProxyScheme
} from "./types"
import { DEFAULT_BYPASS_LIST, PROFILE_COLORS } from "./types"

const VALID_PROXY_TYPES = ["direct", "fixed_servers", "pac_script", "system"]
const VALID_SCHEMES = ["http", "https", "socks4", "socks5"]

/**
 * ユニーク ID を生成する
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * 空のプロファイルを作成する
 */
export function createEmptyProfile(): ProxyProfile {
  return {
    id: generateId(),
    name: "",
    color: PROFILE_COLORS[0],
    type: "fixed_servers",
    config: {
      singleProxy: { scheme: "http", host: "", port: 8080 }
    },
    bypassList: [...DEFAULT_BYPASS_LIST],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

/**
 * プロファイルの概要テキストを取得する
 */
export function getProfileSummary(profile: ProxyProfile): string {
  if (profile.type === "direct") return "直接接続"
  if (profile.type === "system") return "システム設定"
  if (profile.type === "pac_script") {
    return profile.config.pacScript?.url
      ? `PAC: ${profile.config.pacScript.url}`
      : "PAC スクリプト"
  }

  const proxy =
    profile.config.singleProxy ??
    profile.config.proxyForHttps ??
    profile.config.proxyForHttp
  if (!proxy) return "未設定"
  return `${proxy.scheme.toUpperCase()} ${proxy.host}:${proxy.port}`
}

/**
 * プロファイルのフィールドを更新して新しいオブジェクトを返す
 */
export function updateProfileField<K extends keyof ProxyProfile>(
  profile: ProxyProfile,
  key: K,
  value: ProxyProfile[K]
): ProxyProfile {
  return { ...profile, [key]: value }
}

/**
 * インポートされたプロファイルのバリデーション
 */
export function validateProfile(profile: unknown): profile is ProxyProfile {
  if (!profile || typeof profile !== "object") return false
  const p = profile as Record<string, unknown>

  if (typeof p.id !== "string" || !p.id) return false
  if (typeof p.name !== "string" || !p.name) return false
  if (typeof p.color !== "string") return false
  if (typeof p.type !== "string" || !VALID_PROXY_TYPES.includes(p.type))
    return false
  if (!p.config || typeof p.config !== "object") return false
  if (!Array.isArray(p.bypassList)) return false

  // fixed_servers の場合、config 内の server 設定を検証
  if (p.type === "fixed_servers") {
    const config = p.config as Record<string, unknown>
    const serverKeys = [
      "singleProxy",
      "proxyForHttp",
      "proxyForHttps",
      "proxyForFtp",
      "fallbackProxy"
    ]
    for (const key of serverKeys) {
      if (config[key] !== undefined) {
        const server = config[key] as Record<string, unknown>
        if (typeof server !== "object" || !server) return false
        if (typeof server.host !== "string") return false
        if (typeof server.port !== "number") return false
        if (
          typeof server.scheme !== "string" ||
          !VALID_SCHEMES.includes(server.scheme)
        )
          return false
      }
    }
  }

  return true
}

/**
 * singleProxy のフィールドを更新して新しいプロファイルを返す
 */
export function updateSingleProxyField(
  profile: ProxyProfile,
  field: keyof FixedServerConfig,
  value: string | number
): ProxyProfile {
  const proxy = profile.config.singleProxy ?? {
    scheme: "http" as ProxyScheme,
    host: "",
    port: 8080
  }
  return {
    ...profile,
    config: {
      ...profile.config,
      singleProxy: { ...proxy, [field]: value }
    }
  }
}

/**
 * PAC スクリプト設定のフィールドを更新して新しいプロファイルを返す
 */
export function updatePacScriptField(
  profile: ProxyProfile,
  field: "url" | "data",
  value: string
): ProxyProfile {
  return {
    ...profile,
    config: {
      ...profile.config,
      pacScript: {
        ...profile.config.pacScript,
        [field]: value || undefined
      }
    }
  }
}

/**
 * singleProxy の認証設定を切り替えて新しいプロファイルを返す
 */
export function toggleProxyAuth(
  profile: ProxyProfile,
  enabled: boolean
): ProxyProfile {
  const proxy = profile.config.singleProxy
  if (!proxy) return profile
  return {
    ...profile,
    config: {
      ...profile.config,
      singleProxy: {
        ...proxy,
        auth: enabled ? { username: "", password: "" } : undefined
      }
    }
  }
}

/**
 * singleProxy の認証情報フィールドを更新して新しいプロファイルを返す
 */
export function updateProxyAuthField(
  profile: ProxyProfile,
  field: "username" | "password",
  value: string
): ProxyProfile {
  const proxy = profile.config.singleProxy
  if (!proxy?.auth) return profile
  return {
    ...profile,
    config: {
      ...profile.config,
      singleProxy: {
        ...proxy,
        auth: { ...proxy.auth, [field]: value }
      }
    }
  }
}
