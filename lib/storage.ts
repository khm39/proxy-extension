import { Storage } from "@plasmohq/storage"

import { validateProfile } from "./profile-utils"
import type {
  AppState,
  ConnectionLogEntry,
  ProxyError,
  ProxyProfile
} from "./types"

const storage = new Storage({ area: "local" })

const PROFILES_KEY = "profiles"
const ACTIVE_PROFILE_ID_KEY = "activeProfileId"
const LAST_ERROR_KEY = "lastError"
const DEV_MODE_KEY = "devMode"
const CONNECTION_LOGS_KEY = "connectionLogs"
const MAX_CONNECTION_LOGS = 500

/**
 * 全プロファイルを取得
 */
export async function getProfiles(): Promise<ProxyProfile[]> {
  const profiles = await storage.get<ProxyProfile[]>(PROFILES_KEY)
  return profiles ?? []
}

/**
 * アクティブなプロファイル ID を取得
 */
export async function getActiveProfileId(): Promise<string | null> {
  const id = await storage.get<string | null>(ACTIVE_PROFILE_ID_KEY)
  return id ?? null
}

/**
 * 最後のプロキシエラーを取得
 */
export async function getLastError(): Promise<ProxyError | null> {
  const error = await storage.get<ProxyError | null>(LAST_ERROR_KEY)
  return error ?? null
}

/**
 * プロキシエラーを保存
 */
export async function setLastError(
  error: ProxyError | null
): Promise<void> {
  await storage.set(LAST_ERROR_KEY, error)
}

/**
 * 開発者モードの状態を取得
 */
export async function getDevMode(): Promise<boolean> {
  const devMode = await storage.get<boolean>(DEV_MODE_KEY)
  return devMode ?? false
}

/**
 * 開発者モードの状態を設定
 */
export async function setDevMode(enabled: boolean): Promise<void> {
  await storage.set(DEV_MODE_KEY, enabled)
}

/**
 * 接続ログを取得
 */
export async function getConnectionLogs(): Promise<ConnectionLogEntry[]> {
  const logs = await storage.get<ConnectionLogEntry[]>(CONNECTION_LOGS_KEY)
  return logs ?? []
}

/**
 * 接続ログを追加
 */
export async function addConnectionLog(
  entry: ConnectionLogEntry
): Promise<void> {
  const logs = await getConnectionLogs()
  logs.push(entry)
  if (logs.length > MAX_CONNECTION_LOGS) {
    logs.splice(0, logs.length - MAX_CONNECTION_LOGS)
  }
  await storage.set(CONNECTION_LOGS_KEY, logs)
}

/**
 * 接続ログをクリア
 */
export async function clearConnectionLogs(): Promise<void> {
  await storage.set(CONNECTION_LOGS_KEY, [])
}

/**
 * アプリの全状態を取得
 */
export async function getState(): Promise<AppState> {
  const [profiles, activeProfileId, lastError, devMode] = await Promise.all([
    getProfiles(),
    getActiveProfileId(),
    getLastError(),
    getDevMode()
  ])
  return { profiles, activeProfileId, lastError, devMode }
}

/**
 * プロファイルを保存（新規作成または更新）
 */
export async function saveProfile(profile: ProxyProfile): Promise<void> {
  const profiles = await getProfiles()
  const index = profiles.findIndex((p) => p.id === profile.id)
  if (index >= 0) {
    profiles[index] = { ...profile, updatedAt: Date.now() }
  } else {
    profiles.push(profile)
  }
  await storage.set(PROFILES_KEY, profiles)
}

/**
 * プロファイルを削除
 */
export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles()
  const filtered = profiles.filter((p) => p.id !== profileId)
  await storage.set(PROFILES_KEY, filtered)

  const activeId = await getActiveProfileId()
  if (activeId === profileId) {
    await setActiveProfileId(null)
  }
}

/**
 * アクティブなプロファイル ID を設定
 */
export async function setActiveProfileId(
  profileId: string | null
): Promise<void> {
  await storage.set(ACTIVE_PROFILE_ID_KEY, profileId)
}

/**
 * アクティブなプロファイルを取得
 */
export async function getActiveProfile(): Promise<ProxyProfile | null> {
  const activeId = await getActiveProfileId()
  if (!activeId) return null
  const profiles = await getProfiles()
  return profiles.find((p) => p.id === activeId) ?? null
}

/**
 * プロファイルを JSON エクスポート
 */
export async function exportProfiles(): Promise<string> {
  const profiles = await getProfiles()
  return JSON.stringify(profiles, null, 2)
}

/**
 * JSON からプロファイルをインポート（バリデーション付き）
 */
export async function importProfiles(
  importedProfiles: unknown[]
): Promise<{ imported: number; skipped: number }> {
  if (!Array.isArray(importedProfiles)) {
    throw new Error("インポートデータは配列である必要があります")
  }

  const existing = await getProfiles()
  const existingIds = new Set(existing.map((p) => p.id))
  let imported = 0
  let skipped = 0

  for (const profile of importedProfiles) {
    if (!validateProfile(profile)) {
      skipped++
      continue
    }

    if (existingIds.has(profile.id)) {
      const index = existing.findIndex((p) => p.id === profile.id)
      existing[index] = profile
    } else {
      existing.push(profile)
    }
    imported++
  }

  await storage.set(PROFILES_KEY, existing)
  return { imported, skipped }
}
