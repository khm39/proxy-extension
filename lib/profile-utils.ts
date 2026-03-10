import type {
  FixedServerConfig,
  ProxyProfile,
  ProxyScheme
} from "./types"
import { DEFAULT_BYPASS_LIST, PROFILE_COLORS } from "./types"

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
