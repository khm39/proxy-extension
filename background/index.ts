import {
  applyProfile,
  deactivateProxy,
  getAuthFromProfile,
  updateBadge
} from "~lib/proxy-manager"
import {
  addConnectionLog,
  getActiveProfile,
  getDevMode,
  setLastError
} from "~lib/storage"
import type { ConnectionLogEntry, ProxyProfile } from "~lib/types"

export {}

/**
 * 拡張機能インストール時の初期化
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[ProxySwitcher] Extension installed")
  await restoreActiveProxy()
})

/**
 * ブラウザ起動時にアクティブなプロキシを復元
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log("[ProxySwitcher] Browser started")
  await restoreActiveProxy()
})

/**
 * アクティブなプロキシ設定を復元する
 */
async function restoreActiveProxy() {
  const profile = await getActiveProfile()
  if (profile) {
    try {
      await applyProfile(profile)
      await updateBadge(profile)
      setupAuthHandler(profile)
    } catch (e) {
      console.error("[ProxySwitcher] Failed to restore proxy:", e)
      await updateBadge(null)
    }
  } else {
    await deactivateProxy()
    await updateBadge(null)
  }
}

/**
 * プロキシ認証ハンドラー (HTTP/HTTPS プロキシのみ)
 */
function setupAuthHandler(profile: ProxyProfile | null) {
  if (chrome.webRequest.onAuthRequired.hasListener(authHandler)) {
    chrome.webRequest.onAuthRequired.removeListener(authHandler)
  }

  if (profile) {
    const auth = getAuthFromProfile(profile)
    if (auth) {
      chrome.webRequest.onAuthRequired.addListener(
        authHandler,
        { urls: ["<all_urls>"] },
        ["asyncBlocking"]
      )
    }
  }
}

/**
 * 認証リクエストハンドラー
 */
async function authHandler(
  details: chrome.webRequest.WebAuthenticationChallengeDetails
): Promise<chrome.webRequest.BlockingResponse> {
  if (!details.isProxy) return {}

  const profile = await getActiveProfile()
  if (!profile) return {}

  const auth = getAuthFromProfile(profile)
  if (!auth) return {}

  return {
    authCredentials: {
      username: auth.username,
      password: auth.password
    }
  }
}

/**
 * 設定に起因するプロキシエラーのパターン
 * これらはプロキシサーバーの停止や設定ミスが原因であり、
 * 拡張機能自体のエラーではないため、警告として扱う
 */
const CONFIG_ERROR_PATTERNS = [
  "ERR_PROXY_CONNECTION_FAILED",
  "ERR_PROXY_CERTIFICATE_INVALID",
  "ERR_TUNNEL_CONNECTION_FAILED",
  "ERR_SOCKS_CONNECTION_FAILED",
  "ERR_SOCKS_CONNECTION_HOST_UNREACHABLE",
  "ERR_PROXY_AUTH_UNSUPPORTED",
  "ERR_MANDATORY_PROXY_CONFIGURATION_FAILED",
  "ERR_NAME_NOT_RESOLVED",
  "ERR_CONNECTION_REFUSED",
  "ERR_CONNECTION_TIMED_OUT",
  "ERR_CONNECTION_RESET"
]

function isConfigError(error: string): boolean {
  return CONFIG_ERROR_PATTERNS.some((pattern) => error.includes(pattern))
}

/**
 * プロキシエラーのハンドリング
 */
chrome.proxy.onProxyError.addListener(async (details) => {
  if (isConfigError(details.error)) {
    console.warn(
      "[ProxySwitcher] Proxy configuration error:",
      details.error
    )
    return
  }

  console.error(
    "[ProxySwitcher] Proxy error:",
    details.error,
    "fatal:",
    details.fatal
  )
  await setLastError({
    message: details.error,
    fatal: details.fatal,
    timestamp: Date.now()
  })
})

/**
 * 開発者モード: リクエスト完了時の接続ログ記録
 */
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    const devMode = await getDevMode()
    if (!devMode) return

    const entry: ConnectionLogEntry = {
      id: `${details.requestId}-${Date.now()}`,
      timestamp: Date.now(),
      method: details.method,
      url: details.url,
      type: details.type,
      statusCode: details.statusCode,
      statusLine: details.statusLine,
      ip: details.ip,
      fromCache: details.fromCache
    }
    await addConnectionLog(entry)
  },
  { urls: ["<all_urls>"] }
)

/**
 * 開発者モード: リクエストエラー時の接続ログ記録
 */
chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    const devMode = await getDevMode()
    if (!devMode) return

    const entry: ConnectionLogEntry = {
      id: `${details.requestId}-${Date.now()}`,
      timestamp: Date.now(),
      method: details.method,
      url: details.url,
      type: details.type,
      fromCache: false,
      error: details.error
    }
    await addConnectionLog(entry)
  },
  { urls: ["<all_urls>"] }
)
