import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import {
  createEmptyProfile,
  getProfileSummary,
  updatePacScriptField,
  updateProfileField,
  updateSingleProxyField
} from "~lib/profile-utils"
import type { AppState, ProxyProfile, ProxyType } from "~lib/types"
import { PROFILE_COLORS } from "~lib/types"

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
      console.error("[ProxySwitcher] Failed to activate profile:", result.error)
    }
    await fetchState()
    setLoading(false)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    const result = await sendToBackground({ name: "deactivate-proxy" })
    if (!result.success) {
      console.error("[ProxySwitcher] Failed to deactivate proxy:", result.error)
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

  const handleNewProfile = () => {
    setEditingProfile(createEmptyProfile())
  }

  const handleCancelEdit = () => {
    setEditingProfile(null)
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

  const updateField = <K extends keyof ProxyProfile>(
    key: K,
    value: ProxyProfile[K]
  ) => {
    if (!editingProfile) return
    setEditingProfile(updateProfileField(editingProfile, key, value))
  }

  const updateProxyField = (
    field: "scheme" | "host" | "port",
    value: string | number
  ) => {
    if (!editingProfile) return
    setEditingProfile(updateSingleProxyField(editingProfile, field, value))
  }

  if (!state) {
    return (
      <div className="popup-container">
        <p className="loading">読み込み中...</p>
      </div>
    )
  }

  // プロファイル登録フォーム表示時
  if (editingProfile) {
    return (
      <div className="popup-container">
        <header className="popup-header">
          <button className="icon-btn" onClick={handleCancelEdit} title="戻る">
            ←
          </button>
          <h1>新規プロファイル</h1>
          <span />
        </header>

        <div className="popup-form">
          <div className="popup-form-group">
            <label>プロファイル名</label>
            <input
              type="text"
              value={editingProfile.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="例: Work Proxy"
              autoFocus
            />
          </div>

          <div className="popup-form-group">
            <label>色</label>
            <div className="popup-color-picker">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-swatch ${editingProfile.color === color ? "selected" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateField("color", color)}
                />
              ))}
            </div>
          </div>

          <div className="popup-form-group">
            <label>プロキシタイプ</label>
            <select
              value={editingProfile.type}
              onChange={(e) =>
                updateField("type", e.target.value as ProxyType)
              }>
              <option value="fixed_servers">固定サーバー</option>
              <option value="pac_script">PAC スクリプト</option>
              <option value="direct">直接接続</option>
              <option value="system">システム設定</option>
            </select>
          </div>

          {editingProfile.type === "fixed_servers" && (
            <>
              <div className="popup-form-group">
                <label>スキーム</label>
                <select
                  value={
                    editingProfile.config.singleProxy?.scheme ?? "http"
                  }
                  onChange={(e) =>
                    updateProxyField("scheme", e.target.value)
                  }>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>
              <div className="popup-form-row">
                <div className="popup-form-group popup-form-flex">
                  <label>ホスト</label>
                  <input
                    type="text"
                    value={editingProfile.config.singleProxy?.host ?? ""}
                    onChange={(e) =>
                      updateProxyField("host", e.target.value)
                    }
                    placeholder="proxy.example.com"
                  />
                </div>
                <div className="popup-form-group popup-form-port">
                  <label>ポート</label>
                  <input
                    type="number"
                    value={editingProfile.config.singleProxy?.port ?? 8080}
                    onChange={(e) =>
                      updateProxyField(
                        "port",
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
            </>
          )}

          {editingProfile.type === "pac_script" && (
            <div className="popup-form-group">
              <label>PAC URL</label>
              <input
                type="text"
                value={editingProfile.config.pacScript?.url ?? ""}
                onChange={(e) =>
                  setEditingProfile(
                    updatePacScriptField(editingProfile, "url", e.target.value)
                  )
                }
                placeholder="https://example.com/proxy.pac"
              />
            </div>
          )}
        </div>

        <footer className="popup-form-actions">
          <button
            className="btn-popup-cancel"
            onClick={handleCancelEdit}
            disabled={saving}>
            キャンセル
          </button>
          <button
            className="btn-popup-save"
            onClick={handleSaveProfile}
            disabled={saving || !editingProfile.name.trim()}>
            {saving ? "保存中..." : "保存"}
          </button>
        </footer>
      </div>
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
            title={state.devMode ? "開発者モード: ON" : "開発者モード: OFF"}>
            {"</>"}
          </button>
          <button className="icon-btn" onClick={openOptions} title="設定">
            ⚙
          </button>
        </div>
      </header>

      {state.devMode && (
        <div className="dev-mode-banner">
          開発者モード有効 — 接続ログ記録中
        </div>
      )}

      {state.lastError && (
        <div
          className={`error-banner ${state.lastError.fatal ? "fatal" : ""}`}>
          <div className="error-content">
            <span className="error-icon">
              {state.lastError.fatal ? "!!" : "!"}
            </span>
            <div className="error-text">
              <span className="error-message">
                {state.lastError.message}
              </span>
              <span className="error-time">
                {new Date(state.lastError.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button
            className="error-dismiss"
            onClick={handleDismissError}
            title="閉じる">
            ×
          </button>
        </div>
      )}

      <div className="profile-list">
        <label
          className={`profile-item ${!state.activeProfileId ? "active" : ""}`}>
          <input
            type="radio"
            name="profile"
            checked={!state.activeProfileId}
            onChange={handleDeactivate}
            disabled={loading}
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
            />
            <span
              className="profile-color"
              style={{ backgroundColor: profile.color }}
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
        <button className="btn-add" onClick={handleNewProfile}>
          + 新規プロファイル
        </button>
      </footer>
    </div>
  )
}

export default IndexPopup
