import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import type { AppState, ProxyProfile } from "~lib/types"

import "./style.css"

function getProfileSummary(profile: ProxyProfile): string {
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

function IndexPopup() {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchState = async () => {
    const result = await sendToBackground({ name: "get-state" })
    setState(result)
  }

  useEffect(() => {
    fetchState()
  }, [])

  const handleActivate = async (profileId: string) => {
    setLoading(true)
    await sendToBackground({
      name: "activate-profile",
      body: { profileId }
    })
    await fetchState()
    setLoading(false)
  }

  const handleDeactivate = async () => {
    setLoading(true)
    await sendToBackground({ name: "deactivate-proxy" })
    await fetchState()
    setLoading(false)
  }

  const openOptions = () => {
    chrome.runtime.openOptionsPage()
  }

  if (!state) {
    return (
      <div className="popup-container">
        <p className="loading">読み込み中...</p>
      </div>
    )
  }

  const handleDismissError = async () => {
    await sendToBackground({ name: "clear-error" })
    await fetchState()
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Proxy Switcher</h1>
        <button className="icon-btn" onClick={openOptions} title="設定">
          ⚙
        </button>
      </header>

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
        <button className="btn-add" onClick={openOptions}>
          + 新規プロファイル
        </button>
      </footer>
    </div>
  )
}

export default IndexPopup
