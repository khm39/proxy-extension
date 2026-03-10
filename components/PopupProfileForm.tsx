import {
  updatePacScriptField,
  updateProfileField,
  updateSingleProxyField
} from "~lib/profile-utils"
import type { ProxyProfile, ProxyType } from "~lib/types"

import { ColorPicker } from "./ColorPicker"
import { ProxyTypeSelect } from "./ProxyTypeSelect"

interface PopupProfileFormProps {
  profile: ProxyProfile
  saving: boolean
  onChange: (profile: ProxyProfile) => void
  onSave: () => void
  onCancel: () => void
}

export function PopupProfileForm({
  profile,
  saving,
  onChange,
  onSave,
  onCancel
}: PopupProfileFormProps) {
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
    <div className="popup-container">
      <header className="popup-header">
        <button className="icon-btn" onClick={onCancel} aria-label="戻る">
          ←
        </button>
        <h1>新規プロファイル</h1>
        <span />
      </header>

      <form
        className="popup-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}>
        <div className="popup-form-group">
          <label htmlFor="popup-profile-name">プロファイル名</label>
          <input
            id="popup-profile-name"
            type="text"
            value={profile.name}
            onChange={(e) => updateField("name", e.target.value)}
            placeholder="例: Work Proxy"
            autoFocus
            required
            aria-required="true"
          />
        </div>

        <div className="popup-form-group">
          <ColorPicker
            selectedColor={profile.color}
            onChange={(color) => updateField("color", color)}
            className="popup-color-picker"
          />
        </div>

        <div className="popup-form-group">
          <ProxyTypeSelect
            id="popup-proxy-type"
            value={profile.type}
            onChange={(type) => updateField("type", type as ProxyType)}
          />
        </div>

        {profile.type === "fixed_servers" && (
          <>
            <div className="popup-form-group">
              <label htmlFor="popup-scheme">スキーム</label>
              <select
                id="popup-scheme"
                value={profile.config.singleProxy?.scheme ?? "http"}
                onChange={(e) => updateProxyField("scheme", e.target.value)}>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div className="popup-form-row">
              <div className="popup-form-group popup-form-flex">
                <label htmlFor="popup-host">ホスト</label>
                <input
                  id="popup-host"
                  type="text"
                  value={profile.config.singleProxy?.host ?? ""}
                  onChange={(e) => updateProxyField("host", e.target.value)}
                  placeholder="proxy.example.com"
                />
              </div>
              <div className="popup-form-group popup-form-port">
                <label htmlFor="popup-port">ポート</label>
                <input
                  id="popup-port"
                  type="number"
                  value={profile.config.singleProxy?.port ?? 8080}
                  onChange={(e) =>
                    updateProxyField("port", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </>
        )}

        {profile.type === "pac_script" && (
          <div className="popup-form-group">
            <label htmlFor="popup-pac-url">PAC URL</label>
            <input
              id="popup-pac-url"
              type="text"
              value={profile.config.pacScript?.url ?? ""}
              onChange={(e) =>
                onChange(
                  updatePacScriptField(profile, "url", e.target.value)
                )
              }
              placeholder="https://example.com/proxy.pac"
            />
          </div>
        )}
      </form>

      <footer className="popup-form-actions">
        <button
          className="btn-popup-cancel"
          onClick={onCancel}
          disabled={saving}>
          キャンセル
        </button>
        <button
          className="btn-popup-save"
          onClick={onSave}
          disabled={saving || !profile.name.trim()}
          aria-busy={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
      </footer>
    </div>
  )
}
