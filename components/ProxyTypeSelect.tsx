import type { ProxyType } from "~lib/types"

interface ProxyTypeSelectProps {
  id: string
  value: ProxyType
  onChange: (type: ProxyType) => void
}

export function ProxyTypeSelect({ id, value, onChange }: ProxyTypeSelectProps) {
  return (
    <div className="form-group">
      <label htmlFor={id}>プロキシタイプ</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ProxyType)}>
        <option value="fixed_servers">固定サーバー</option>
        <option value="pac_script">PAC スクリプト</option>
        <option value="direct">直接接続</option>
        <option value="system">システム設定</option>
      </select>
    </div>
  )
}
