import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import {
  createEmptyProfile,
  toggleProxyAuth,
  updatePacScriptField,
  updateProfileField,
  updateProxyAuthField,
  updateSingleProxyField
} from "~lib/profile-utils"
import type {
  AppState,
  ConnectionLogEntry,
  ProxyProfile,
  ProxyType
} from "~lib/types"
import { PROFILE_COLORS } from "~lib/types"

import "./style.css"

type OptionsView = "profiles" | "devtools"

function IndexOptions() {
  const [state, setState] = useState<AppState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<ProxyProfile | null>(
    null
  )
  const [bypassInput, setBypassInput] = useState("")
  const [currentView, setCurrentView] = useState<OptionsView>("profiles")
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>(
    []
  )
  const [logFilter, setLogFilter] = useState("")

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

  const addBypassItem = () => {
    if (!editingProfile || !bypassInput.trim()) return
    if (editingProfile.bypassList.includes(bypassInput.trim())) return
    updateField("bypassList", [
      ...editingProfile.bypassList,
      bypassInput.trim()
    ])
    setBypassInput("")
  }

  const removeBypassItem = (item: string) => {
    if (!editingProfile) return
    updateField(
      "bypassList",
      editingProfile.bypassList.filter((b) => b !== item)
    )
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

  const filteredLogs = connectionLogs
    .filter(
      (log) =>
        !logFilter ||
        log.url.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.method.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.type.toLowerCase().includes(logFilter.toLowerCase()) ||
        (log.error && log.error.toLowerCase().includes(logFilter.toLowerCase()))
    )
    .reverse()

  if (!state) {
    return (
      <div className="options-container">
        <p className="loading">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="options-container">
      {/* サイドバー */}
      <div className="sidebar">
        <div className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${currentView === "profiles" ? "active" : ""}`}
            onClick={() => setCurrentView("profiles")}>
            プロファイル
          </button>
          <button
            className={`sidebar-nav-item ${currentView === "devtools" ? "active" : ""}`}
            onClick={() => setCurrentView("devtools")}>
            {"</>"} 開発者ツール
          </button>
        </div>

        {currentView === "profiles" && (
          <>
            <div className="sidebar-profiles">
              {state.profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={`sidebar-item ${selectedId === profile.id ? "selected" : ""}`}
                  onClick={() => selectProfile(profile)}>
                  <span
                    className="profile-color"
                    style={{ backgroundColor: profile.color }}
                  />
                  {profile.name}
                  {state.activeProfileId === profile.id && (
                    <span
                      style={{ color: "var(--accent)", marginLeft: "auto" }}>
                      ●
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
                <span className="dev-status-label">開発者モード</span>
                <button
                  className={`dev-toggle ${state.devMode ? "on" : "off"}`}
                  onClick={handleToggleDevMode}>
                  {state.devMode ? "ON" : "OFF"}
                </button>
              </div>
              {state.devMode && (
                <div className="sidebar-dev-info">
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
      </div>

      {/* エディターパネル */}
      <div className="editor-panel">
        {currentView === "devtools" ? (
          <div className="devtools-panel">
            <h2>接続ログ</h2>
            {!state.devMode ? (
              <div className="empty-state">
                開発者モードを有効にすると接続ログの記録が開始されます
              </div>
            ) : (
              <>
                <div className="log-toolbar">
                  <input
                    type="text"
                    className="log-filter"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder="URL、メソッド、タイプでフィルタ..."
                  />
                  <span className="log-count">
                    {filteredLogs.length} / {connectionLogs.length} 件
                  </span>
                </div>
                <div className="log-table-container">
                  <table className="log-table">
                    <thead>
                      <tr>
                        <th>時刻</th>
                        <th>メソッド</th>
                        <th>ステータス</th>
                        <th>タイプ</th>
                        <th>URL</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={log.error ? "log-error" : ""}>
                          <td className="log-time">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="log-method">{log.method}</td>
                          <td
                            className={`log-status ${log.statusCode && log.statusCode >= 400 ? "status-error" : ""}`}>
                            {log.error ? (
                              <span title={log.error}>ERR</span>
                            ) : (
                              log.statusCode
                            )}
                          </td>
                          <td className="log-type">{log.type}</td>
                          <td className="log-url" title={log.url}>
                            {log.url}
                          </td>
                          <td className="log-ip">{log.ip ?? "-"}</td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="log-empty">
                            {connectionLogs.length === 0
                              ? "ログがありません"
                              : "フィルタに一致するログがありません"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : !editingProfile ? (
          <div className="empty-state">
            プロファイルを選択するか、新規作成してください
          </div>
        ) : (
          <>
            <h2>
              {state.profiles.find((p) => p.id === editingProfile.id)
                ? "プロファイルを編集"
                : "新規プロファイル"}
            </h2>

            {/* 基本情報 */}
            <div className="form-group">
              <label>プロファイル名</label>
              <input
                type="text"
                value={editingProfile.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="例: Work Proxy"
              />
            </div>

            <div className="form-group">
              <label>色</label>
              <div className="color-picker">
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

            <div className="form-group">
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

            {/* 固定サーバー設定 */}
            {editingProfile.type === "fixed_servers" && (
              <div className="section">
                <h3>サーバー設定</h3>
                <div className="form-row">
                  <div className="form-group">
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
                  <div className="form-group">
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
                  <div className="form-group">
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

                {/* 認証設定 */}
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="use-auth"
                    checked={!!editingProfile.config.singleProxy?.auth}
                    onChange={(e) =>
                      setEditingProfile(
                        toggleProxyAuth(editingProfile, e.target.checked)
                      )
                    }
                  />
                  <label htmlFor="use-auth">認証を使用する</label>
                </div>

                {editingProfile.config.singleProxy?.auth && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>ユーザー名</label>
                      <input
                        type="text"
                        value={
                          editingProfile.config.singleProxy.auth.username
                        }
                        onChange={(e) =>
                          setEditingProfile(
                            updateProxyAuthField(editingProfile, "username", e.target.value)
                          )
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>パスワード</label>
                      <input
                        type="password"
                        value={
                          editingProfile.config.singleProxy.auth.password
                        }
                        onChange={(e) =>
                          setEditingProfile(
                            updateProxyAuthField(editingProfile, "password", e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAC スクリプト設定 */}
            {editingProfile.type === "pac_script" && (
              <div className="section">
                <h3>PAC スクリプト</h3>
                <div className="form-group">
                  <label>
                    PAC URL (URL またはインラインスクリプトのいずれかを指定)
                  </label>
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
                <div className="form-group">
                  <label>インラインスクリプト</label>
                  <textarea
                    value={editingProfile.config.pacScript?.data ?? ""}
                    onChange={(e) =>
                      setEditingProfile(
                        updatePacScriptField(editingProfile, "data", e.target.value)
                      )
                    }
                    placeholder={`function FindProxyForURL(url, host) {\n  return "DIRECT";\n}`}
                  />
                </div>
              </div>
            )}

            {/* バイパスリスト */}
            {editingProfile.type === "fixed_servers" && (
              <div className="section">
                <h3>バイパスリスト</h3>
                <div className="bypass-list">
                  {editingProfile.bypassList.map((item) => (
                    <span key={item} className="bypass-tag">
                      {item}
                      <button onClick={() => removeBypassItem(item)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="bypass-input-row">
                  <input
                    type="text"
                    value={bypassInput}
                    onChange={(e) => setBypassInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addBypassItem()}
                    placeholder="例: *.local"
                  />
                  <button onClick={addBypassItem}>追加</button>
                </div>
              </div>
            )}

            {/* アクション */}
            <div className="editor-actions">
              <button className="btn-primary" onClick={handleSave}>
                保存
              </button>
              {state.profiles.find((p) => p.id === editingProfile.id) && (
                <button className="btn-danger" onClick={handleDelete}>
                  削除
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default IndexOptions
