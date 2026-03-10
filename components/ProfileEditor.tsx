import { useState } from "react"

import {
  toggleProxyAuth,
  updatePacScriptField,
  updateProfileField,
  updateProxyAuthField,
  updateSingleProxyField
} from "~lib/profile-utils"
import type { ProxyProfile, ProxyType } from "~lib/types"

import { ColorPicker } from "./ColorPicker"
import { ProxyTypeSelect } from "./ProxyTypeSelect"

interface ProfileEditorProps {
  profile: ProxyProfile
  isNew: boolean
  onChange: (profile: ProxyProfile) => void
  onSave: () => void
  onDelete: () => void
}

export function ProfileEditor({
  profile,
  isNew,
  onChange,
  onSave,
  onDelete
}: ProfileEditorProps) {
  const updateField = <K extends keyof ProxyProfile>(
    key: K,
    value: ProxyProfile[K]
  ) => {
    onChange(updateProfileField(profile, key, value))
  }

  const updateProxyField = (
    field: "scheme" | "host" | "port",
    value: string | number
  ) => {
    onChange(updateSingleProxyField(profile, field, value))
  }

  return (
    <>
      <h2>{isNew ? "新規プロファイル" : "プロファイルを編集"}</h2>

      {/* 基本情報 */}
      <div className="form-group">
        <label htmlFor="opt-profile-name">プロファイル名</label>
        <input
          id="opt-profile-name"
          type="text"
          value={profile.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="例: Work Proxy"
          aria-required="true"
        />
      </div>

      <ColorPicker
        selectedColor={profile.color}
        onChange={(color) => updateField("color", color)}
      />

      <ProxyTypeSelect
        id="opt-proxy-type"
        value={profile.type}
        onChange={(type) => updateField("type", type as ProxyType)}
      />

      {/* 固定サーバー設定 */}
      {profile.type === "fixed_servers" && (
        <FixedServerSection
          profile={profile}
          onChange={onChange}
          updateProxyField={updateProxyField}
        />
      )}

      {/* PAC スクリプト設定 */}
      {profile.type === "pac_script" && (
        <PacScriptSection profile={profile} onChange={onChange} />
      )}

      {/* バイパスリスト */}
      {profile.type === "fixed_servers" && (
        <BypassListSection
          bypassList={profile.bypassList}
          onChange={(list) => updateField("bypassList", list)}
        />
      )}

      {/* アクション */}
      <div className="editor-actions">
        <button className="btn-primary" onClick={onSave}>
          保存
        </button>
        {!isNew && (
          <button className="btn-danger" onClick={onDelete}>
            削除
          </button>
        )}
      </div>
    </>
  )
}

// --- サブコンポーネント ---

function FixedServerSection({
  profile,
  onChange,
  updateProxyField
}: {
  profile: ProxyProfile
  onChange: (profile: ProxyProfile) => void
  updateProxyField: (
    field: "scheme" | "host" | "port",
    value: string | number
  ) => void
}) {
  return (
    <div className="section">
      <h3>サーバー設定</h3>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="opt-scheme">スキーム</label>
          <select
            id="opt-scheme"
            value={profile.config.singleProxy?.scheme ?? "http"}
            onChange={(e) => updateProxyField("scheme", e.target.value)}>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="socks4">SOCKS4</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="opt-host">ホスト</label>
          <input
            id="opt-host"
            type="text"
            value={profile.config.singleProxy?.host ?? ""}
            onChange={(e) => updateProxyField("host", e.target.value)}
            placeholder="proxy.example.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="opt-port">ポート</label>
          <input
            id="opt-port"
            type="number"
            value={profile.config.singleProxy?.port ?? 8080}
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
          checked={!!profile.config.singleProxy?.auth}
          onChange={(e) =>
            onChange(toggleProxyAuth(profile, e.target.checked))
          }
        />
        <label htmlFor="use-auth">認証を使用する</label>
      </div>

      {profile.config.singleProxy?.auth && (
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="opt-username">ユーザー名</label>
            <input
              id="opt-username"
              type="text"
              value={profile.config.singleProxy.auth.username}
              onChange={(e) =>
                onChange(
                  updateProxyAuthField(profile, "username", e.target.value)
                )
              }
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="opt-password">パスワード</label>
            <input
              id="opt-password"
              type="password"
              value={profile.config.singleProxy.auth.password}
              onChange={(e) =>
                onChange(
                  updateProxyAuthField(profile, "password", e.target.value)
                )
              }
              autoComplete="current-password"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PacScriptSection({
  profile,
  onChange
}: {
  profile: ProxyProfile
  onChange: (profile: ProxyProfile) => void
}) {
  return (
    <div className="section">
      <h3>PAC スクリプト</h3>
      <div className="form-group">
        <label htmlFor="opt-pac-url">
          PAC URL (URL またはインラインスクリプトのいずれかを指定)
        </label>
        <input
          id="opt-pac-url"
          type="text"
          value={profile.config.pacScript?.url ?? ""}
          onChange={(e) =>
            onChange(updatePacScriptField(profile, "url", e.target.value))
          }
          placeholder="https://example.com/proxy.pac"
        />
      </div>
      <div className="form-group">
        <label htmlFor="opt-pac-data">インラインスクリプト</label>
        <textarea
          id="opt-pac-data"
          value={profile.config.pacScript?.data ?? ""}
          onChange={(e) =>
            onChange(updatePacScriptField(profile, "data", e.target.value))
          }
          placeholder={`function FindProxyForURL(url, host) {\n  return "DIRECT";\n}`}
        />
      </div>
    </div>
  )
}

function BypassListSection({
  bypassList,
  onChange
}: {
  bypassList: string[]
  onChange: (list: string[]) => void
}) {
  const [bypassInput, setBypassInput] = useState("")

  const addItem = () => {
    if (!bypassInput.trim()) return
    if (bypassList.includes(bypassInput.trim())) return
    onChange([...bypassList, bypassInput.trim()])
    setBypassInput("")
  }

  const removeItem = (item: string) => {
    onChange(bypassList.filter((b) => b !== item))
  }

  return (
    <div className="section">
      <h3 id="bypass-heading">バイパスリスト</h3>
      <div className="bypass-list" role="list" aria-labelledby="bypass-heading">
        {bypassList.map((item) => (
          <span key={item} className="bypass-tag" role="listitem">
            {item}
            <button onClick={() => removeItem(item)} aria-label={`${item} を削除`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="bypass-input-row">
        <label htmlFor="opt-bypass-input" className="sr-only">
          バイパスルールを追加
        </label>
        <input
          id="opt-bypass-input"
          type="text"
          value={bypassInput}
          onChange={(e) => setBypassInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="例: *.local"
        />
        <button onClick={addItem}>追加</button>
      </div>
    </div>
  )
}

