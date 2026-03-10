import { sendToBackground } from "@plasmohq/messaging"
import { useEffect, useState } from "react"

import type {
  AppState,
  FixedServerConfig,
  ProxyProfile,
  ProxyScheme,
  ProxyType
} from "~lib/types"
import { DEFAULT_BYPASS_LIST, PROFILE_COLORS } from "~lib/types"

import "./style.css"

function generateId(): string {
  return crypto.randomUUID()
}

function createEmptyProfile(): ProxyProfile {
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

export default function Options() {
  const [state, setState] = useState<AppState | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<ProxyProfile | null>(
    null
  )
  const [bypassInput, setBypassInput] = useState("")

  const fetchState = async () => {
    const result = await sendToBackground({ name: "get-state" })
    setState(result)
  }

  useEffect(() => {
    fetchState()
  }, [])

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

    await sendToBackground({
      name: "save-profile",
      body: { profile: { ...editingProfile, updatedAt: Date.now() } }
    })
    await fetchState()
  }

  const handleDelete = async () => {
    if (!selectedId) return
    if (!confirm("このプロファイルを削除しますか？")) return

    await sendToBackground({
      name: "delete-profile",
      body: { profileId: selectedId }
    })
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
        await sendToBackground({
          name: "import-profiles",
          body: { profiles }
        })
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
    setEditingProfile({ ...editingProfile, [key]: value })
  }

  const updateProxyField = (
    field: keyof FixedServerConfig,
    value: string | number
  ) => {
    if (!editingProfile) return
    const proxy = editingProfile.config.singleProxy ?? {
      scheme: "http" as ProxyScheme,
      host: "",
      port: 8080
    }
    setEditingProfile({
      ...editingProfile,
      config: {
        ...editingProfile.config,
        singleProxy: { ...proxy, [field]: value }
      }
    })
  }

  const addBypassItem = () => {
    if (!editingProfile || !bypassInput.trim()) return
    if (editingProfile.bypassList.includes(bypassInput.trim())) return
    updateField("bypassList", [...editingProfile.bypassList, bypassInput.trim()])
    setBypassInput("")
  }

  const removeBypassItem = (item: string) => {
    if (!editingProfile) return
    updateField(
      "bypassList",
      editingProfile.bypassList.filter((b) => b !== item)
    )
  }

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
        <div className="sidebar-header">
          <h2>プロファイル</h2>
        </div>
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
                <span style={{ color: "var(--accent)", marginLeft: "auto" }}>
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
      </div>

      {/* エディターパネル */}
      <div className="editor-panel">
        {!editingProfile ? (
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
                      value={editingProfile.config.singleProxy?.scheme ?? "http"}
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
                      onChange={(e) => updateProxyField("host", e.target.value)}
                      placeholder="proxy.example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>ポート</label>
                    <input
                      type="number"
                      value={editingProfile.config.singleProxy?.port ?? 8080}
                      onChange={(e) =>
                        updateProxyField("port", parseInt(e.target.value) || 0)
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
                    onChange={(e) => {
                      const proxy = editingProfile.config.singleProxy
                      if (!proxy) return
                      setEditingProfile({
                        ...editingProfile,
                        config: {
                          ...editingProfile.config,
                          singleProxy: {
                            ...proxy,
                            auth: e.target.checked
                              ? { username: "", password: "" }
                              : undefined
                          }
                        }
                      })
                    }}
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
                        onChange={(e) => {
                          const proxy = editingProfile.config.singleProxy!
                          setEditingProfile({
                            ...editingProfile,
                            config: {
                              ...editingProfile.config,
                              singleProxy: {
                                ...proxy,
                                auth: {
                                  ...proxy.auth!,
                                  username: e.target.value
                                }
                              }
                            }
                          })
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>パスワード</label>
                      <input
                        type="password"
                        value={
                          editingProfile.config.singleProxy.auth.password
                        }
                        onChange={(e) => {
                          const proxy = editingProfile.config.singleProxy!
                          setEditingProfile({
                            ...editingProfile,
                            config: {
                              ...editingProfile.config,
                              singleProxy: {
                                ...proxy,
                                auth: {
                                  ...proxy.auth!,
                                  password: e.target.value
                                }
                              }
                            }
                          })
                        }}
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
                  <label>PAC URL (URL またはインラインスクリプトのいずれかを指定)</label>
                  <input
                    type="text"
                    value={editingProfile.config.pacScript?.url ?? ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        config: {
                          ...editingProfile.config,
                          pacScript: {
                            ...editingProfile.config.pacScript,
                            url: e.target.value || undefined
                          }
                        }
                      })
                    }
                    placeholder="https://example.com/proxy.pac"
                  />
                </div>
                <div className="form-group">
                  <label>インラインスクリプト</label>
                  <textarea
                    value={editingProfile.config.pacScript?.data ?? ""}
                    onChange={(e) =>
                      setEditingProfile({
                        ...editingProfile,
                        config: {
                          ...editingProfile.config,
                          pacScript: {
                            ...editingProfile.config.pacScript,
                            data: e.target.value || undefined
                          }
                        }
                      })
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
                      <button onClick={() => removeBypassItem(item)}>×</button>
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
