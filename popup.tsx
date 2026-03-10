import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import { createEmptyProfile, getProfileSummary } from "~lib/profile-utils"
import type { AppState, ProxyProfile } from "~lib/types"

import { ErrorBanner } from "~components/ErrorBanner"
import { PopupProfileForm } from "~components/PopupProfileForm"

import "./style.css"

function IndexPopup() {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ProxyProfile | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  const fetchState = async () => {
    const result = await sendToBackground({ name: "get-state" })
    setState(result)
  }

  useEffect(() => {
    fetchState()
  }, [])

  const handleActivate = async (profileId: string) => {
    setLoading(true)
    const result = await sendToBackground({
      name: "activate-profile",
      body: { profileId }
    })
    if (!result.success) {
      console.error(
        "[ProxySwitcher] Failed to activate profile:",
        result.error
      )
    }
    await fetchState()
    setLoading(false)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    const result = await sendToBackground({ name: "deactivate-proxy" })
    if (!result.success) {
      console.error(
        "[ProxySwitcher] Failed to deactivate proxy:",
        result.error
      )
    }
    await fetchState()
    setLoading(false)
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  const handleToggleDevMode = async () => {
    await sendToBackground({
      name: "toggle-dev-mode",
      body: { enabled: !state?.devMode }
    })
    await fetchState()
  }

  const handleDismissError = async () => {
    await sendToBackground({ name: "clear-error" })
    await fetchState()
  }

  const handleSaveProfile = async () => {
    if (!editingProfile || !editingProfile.name.trim()) return
    setSaving(true)
    const result = await sendToBackground({
      name: "save-profile",
      body: { profile: { ...editingProfile, updatedAt: Date.now() } }
    })
    if (!result.success) {
      console.error("[ProxySwitcher] Failed to save profile:", result.error)
    }
    await fetchState()
    setEditingProfile(null)
    setSaving(false)
  }

  if (!state) {
    return (
      <div className="popup-container" role="status" aria-live="polite">
        <p className="loading">読み込み中...</p>
      </div>
    )
  }

  if (editingProfile) {
    return (
      <PopupProfileForm
        profile={editingProfile}
        saving={saving}
        onChange={setEditingProfile}
        onSave={handleSaveProfile}
        onCancel={() => setEditingProfile(null)}
      />
    )
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Proxy Switcher</h1>
        <div className="popup-header-actions">
          <button
            className={`icon-btn ${state.devMode ? "dev-mode-active" : ""}`}
            onClick={handleToggleDevMode}
            aria-label={
              state.devMode ? "開発者モード: ON" : "開発者モード: OFF"
            }
            aria-pressed={state.devMode}>
            {"</>"}
          </button>
          <button
            className="icon-btn"
            onClick={openOptions}
            aria-label="設定を開く">
            ⚙
          </button>
        </div>
      </header>

      {state.devMode && (
        <div className="dev-mode-banner" role="status">
          開発者モード有効 — 接続ログ記録中
        </div>
      )}

      {state.lastError && (
        <ErrorBanner error={state.lastError} onDismiss={handleDismissError} />
      )}

      <div
        className="profile-list"
        role="radiogroup"
        aria-label="プロキシプロファイル">
        <label
          className={`profile-item ${!state.activeProfileId ? "active" : ""}`}>
          <input
            type="radio"
            name="profile"
            checked={!state.activeProfileId}
            onChange={handleDeactivate}
            disabled={loading}
            aria-label="直接接続 (プロキシなし)"
          />
          <div className="profile-info">
            <span className="profile-name">直接接続 (プロキシなし)</span>
          </div>
        </label>

        {state.profiles.map((profile) => (
          <label
            key={profile.id}
            className={`profile-item ${state.activeProfileId === profile.id ? "active" : ""}`}>
            <input
              type="radio"
              name="profile"
              checked={state.activeProfileId === profile.id}
              onChange={() => handleActivate(profile.id)}
              disabled={loading}
              aria-label={`${profile.name} - ${getProfileSummary(profile)}`}
            />
            <span
              className="profile-color"
              style={{ backgroundColor: profile.color }}
              aria-hidden="true"
            />
            <div className="profile-info">
              <span className="profile-name">{profile.name}</span>
              <span className="profile-detail">
                {getProfileSummary(profile)}
              </span>
            </div>
          </label>
        ))}
      </div>

      <footer className="popup-footer">
        <button
          className="btn-add"
          onClick={() => setEditingProfile(createEmptyProfile())}>
          + 新規プロファイル
        </button>
      </footer>

      <div aria-live="polite" className="sr-only">
        {loading && "プロファイルを切り替え中..."}
      </div>
    </div>
  )
}

export default IndexPopup
