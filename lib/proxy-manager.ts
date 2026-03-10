import type { FixedServerConfig, ProxyProfile } from "./types"

/**
 * ProxyProfile を chrome.proxy.settings.set() 用の設定オブジェクトに変換する
 */
function buildChromeProxyConfig(
  profile: ProxyProfile
): chrome.proxy.ProxyConfig {
  switch (profile.type) {
    case "direct":
      return { mode: "direct" }

    case "system":
      return { mode: "system" }

    case "fixed_servers": {
      const rules: chrome.proxy.ProxyRules = {
        bypassList: profile.bypassList
      }

      if (profile.config.singleProxy) {
        rules.singleProxy = toProxyServer(profile.config.singleProxy)
      } else {
        if (profile.config.proxyForHttp) {
          rules.proxyForHttp = toProxyServer(profile.config.proxyForHttp)
        }
        if (profile.config.proxyForHttps) {
          rules.proxyForHttps = toProxyServer(profile.config.proxyForHttps)
        }
        if (profile.config.proxyForFtp) {
          rules.proxyForFtp = toProxyServer(profile.config.proxyForFtp)
        }
        if (profile.config.fallbackProxy) {
          rules.fallbackProxy = toProxyServer(profile.config.fallbackProxy)
        }
      }

      return { mode: "fixed_servers", rules }
    }

    case "pac_script": {
      const pacScript: chrome.proxy.PacScript = {}
      if (profile.config.pacScript?.url) {
        pacScript.url = profile.config.pacScript.url
      } else if (profile.config.pacScript?.data) {
        pacScript.data = profile.config.pacScript.data
      }
      if (profile.config.pacScript?.mandatory !== undefined) {
        pacScript.mandatory = profile.config.pacScript.mandatory
      }
      return { mode: "pac_script", pacScript }
    }

    default:
      return { mode: "direct" }
  }
}

function toProxyServer(
  config: FixedServerConfig
): chrome.proxy.ProxyServer {
  return {
    scheme: config.scheme,
    host: config.host,
    port: config.port
  }
}

/**
 * プロファイルのプロキシ設定を Chrome に適用する
 */
export async function applyProfile(profile: ProxyProfile): Promise<void> {
  const config = buildChromeProxyConfig(profile)
  return new Promise<void>((resolve, reject) => {
    chrome.proxy.settings.set(
      { value: config, scope: "regular" },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      }
    )
  })
}

/**
 * プロキシを解除して直接接続に戻す
 */
export async function deactivateProxy(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chrome.proxy.settings.set(
      { value: { mode: "direct" }, scope: "regular" },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      }
    )
  })
}

/**
 * プロファイルから認証情報を取得する（HTTP/HTTPS プロキシのみ）
 */
export function getAuthFromProfile(
  profile: ProxyProfile
): { username: string; password: string } | null {
  const configs = [
    profile.config.singleProxy,
    profile.config.proxyForHttp,
    profile.config.proxyForHttps,
    profile.config.fallbackProxy
  ]
  for (const config of configs) {
    if (config?.auth?.username && config?.auth?.password) {
      return {
        username: config.auth.username,
        password: config.auth.password
      }
    }
  }
  return null
}

/**
 * アイコンバッジを更新する
 */
export async function updateBadge(
  profile: ProxyProfile | null
): Promise<void> {
  if (profile) {
    await chrome.action.setBadgeText({ text: "ON" })
    await chrome.action.setBadgeBackgroundColor({ color: profile.color })
  } else {
    await chrome.action.setBadgeText({ text: "" })
  }
}
