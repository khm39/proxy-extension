import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import { createEmptyProfile } from "~lib/profile-utils"
import type { AppState, ConnectionLogEntry, ProxyProfile } from "~lib/types"

import { DevToolsPanel } from "~components/DevToolsPanel"
import { ProfileEditor } from "~components/ProfileEditor"

import "./style.css"

type OptionsView = "profiles" | "devtools"

function IndexOptions() {
  const [state, setState] = useState<AppState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<ProxyProfile | null>(
    null
  )
  const [currentView, setCurrentView] = useState<OptionsView>("profiles")
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>(
    []
  )

  const fetchState = async () => {
    const result = await sendToBackground({ name: "get-state" })
    setState(result)
  }

  const fetchLogs = async () => {
    const result = await sendToBackground({ name: "get-connection-logs" })
    setConnectionLogs(result.logs ?? [])
  }

  useEffect(() => {
    fetchState()
  }, [])

  useEffect(() => {
    if (currentView === "devtools" && state?.devMode) {
      fetchLogs()
      const interval = setInterval(fetchLogs, 3000)
      return () => clearInterval(interval)
    }
  }, [currentView, state?.devMode])

  const selectProfile = (profile: ProxyProfile) => {
    setSelectedId(profile.id)
    setEditingProfile({ ...profile })
  }

  const handleNew = () => {
    const profile = createEmptyProfile()
    setSelectedId(profile.id)
    setEditingProfile(profile)
  }

  const handleSave = async () => {
    if (!editingProfile || !editingProfile.name.trim()) return

    const updatedProfile = { ...editingProfile, updatedAt: Date.now() }
    const result = await sendToBackground({
      name: "save-profile",
      body: { profile: updatedProfile }
    })
    if (!result.success) {
      console.error("[ProxySwitcher] Failed to save profile:", result.error)
      return
    }
    setEditingProfile(updatedProfile)
    await fetchState()
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm("このプロファイルを削除しますか？")) return

    const result = await sendToBackground({
      name: "delete-profile",
      body: { profileId: selectedId }
    })
    if (!result.success) {
      console.error("[ProxySwitcher] Failed to delete profile:", result.error)
      return
    }
    setSelectedId(null)
    setEditingProfile(null)
    await fetchState()
  }

  const handleExport = async () => {
    const result = await sendToBackground({ name: "export-profiles" })
    const blob = new Blob([result.data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "proxy-profiles.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      try {
        const profiles = JSON.parse(text)
        if (!Array.isArray(profiles)) {
          alert("無効な JSON ファイルです: 配列を含むファイルを指定してください")
          return
        }
        const result = await sendToBackground({
          name: "import-profiles",
          body: { profiles }
        })
        if (result.skipped > 0) {
          alert(
            `インポート完了: ${result.imported} 件成功、${result.skipped} 件スキップ（無効なデータ）`
          )
        }
        await fetchState()
      } catch {
        alert("無効な JSON ファイルです")
      }
    }
    input.click()
  }

  const handleToggleDevMode = async () => {
    await sendToBackground({
      name: "toggle-dev-mode",
      body: { enabled: !state?.devMode }
    })
    await fetchState()
  }

  const handleClearLogs = async () => {
    await sendToBackground({ name: "clear-connection-logs" })
    setConnectionLogs([])
  }

  if (!state) {
    return (
      <div className="options-container" role="status" aria-live="polite">
        <p className="loading">読み込み中...</p>
      </div>
    )
  }

  const isNewProfile =
    editingProfile != null &&
    !state.profiles.find((p) => p.id === editingProfile.id)

  return (
    <div className="options-container">
      {/* サイドバー */}
      <nav className="sidebar" aria-label="サイドバーナビゲーション">
        <div
          className="sidebar-nav"
          role="tablist"
          aria-label="メインナビゲーション">
          <button
            className={`sidebar-nav-item ${currentView === "profiles" ? "active" : ""}`}
            onClick={() => setCurrentView("profiles")}
            role="tab"
            aria-selected={currentView === "profiles"}
            aria-controls="panel-profiles"
            id="tab-profiles">
            プロファイル
          </button>
          <button
            className={`sidebar-nav-item ${currentView === "devtools" ? "active" : ""}`}
            onClick={() => setCurrentView("devtools")}
            role="tab"
            aria-selected={currentView === "devtools"}
            aria-controls="panel-devtools"
            id="tab-devtools">
            {"</>"} 開発者ツール
          </button>
        </div>

        {currentView === "profiles" && (
          <>
            <div
              className="sidebar-profiles"
              role="list"
              aria-label="プロファイル一覧">
              {state.profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`sidebar-item ${selectedId === profile.id ? "selected" : ""}`}
                  onClick={() => selectProfile(profile)}
                  role="listitem"
                  aria-current={
                    selectedId === profile.id ? "true" : undefined
                  }>
                  <span
                    className="profile-color"
                    style={{ backgroundColor: profile.color }}
                    aria-hidden="true"
                  />
                  {profile.name}
                  {state.activeProfileId === profile.id && (
                    <span className="active-indicator" aria-label="有効">
                      ● 有効
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="sidebar-footer">
              <button className="btn-primary" onClick={handleNew}>
                + 新規プロファイル
              </button>
              <button className="btn-secondary" onClick={handleImport}>
                インポート
              </button>
              <button className="btn-secondary" onClick={handleExport}>
                エクスポート
              </button>
            </div>
          </>
        )}

        {currentView === "devtools" && (
          <>
            <div className="sidebar-profiles">
              <div className="sidebar-dev-status">
                <span className="dev-status-label" id="dev-mode-label">
                  開発者モード
                </span>
                <button
                  className={`dev-toggle ${state.devMode ? "on" : "off"}`}
                  onClick={handleToggleDevMode}
                  role="switch"
                  aria-checked={state.devMode}
                  aria-labelledby="dev-mode-label">
                  {state.devMode ? "ON" : "OFF"}
                </button>
              </div>
              {state.devMode && (
                <div className="sidebar-dev-info" aria-live="polite">
                  <span>ログ件数: {connectionLogs.length}</span>
                </div>
              )}
            </div>
            <div className="sidebar-footer">
              <button className="btn-secondary" onClick={fetchLogs}>
                更新
              </button>
              <button className="btn-danger" onClick={handleClearLogs}>
                ログをクリア
              </button>
            </div>
          </>
        )}
      </nav>

      {/* エディターパネル */}
      <main
        className="editor-panel"
        id={`panel-${currentView}`}
        role="tabpanel"
        aria-labelledby={`tab-${currentView}`}>
        {currentView === "devtools" ? (
          <DevToolsPanel devMode={state.devMode} logs={connectionLogs} />
        ) : !editingProfile ? (
          <div className="empty-state">
            プロファイルを選択するか、新規作成してください
          </div>
        ) : (
          <ProfileEditor
            profile={editingProfile}
            isNew={isNewProfile}
            onChange={setEditingProfile}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  )
}

export default IndexOptions
