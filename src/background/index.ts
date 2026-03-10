import {
  applyProfile,
  deactivateProxy,
  getAuthFromProfile,
  updateBadge
} from "~lib/proxy-manager"
import { getActiveProfile, getActiveProfileId, getProfiles } from "~lib/storage"

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
  // 既存リスナーがあれば削除
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

import type { ProxyProfile } from "~lib/types"

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
 * プロキシエラーのハンドリング
 */
chrome.proxy.onProxyError.addListener((details) => {
  console.error("[ProxySwitcher] Proxy error:", details.error, "fatal:", details.fatal)
})
