import type { ConnectionLogEntry } from "~lib/types"

interface ConnectionLogTableProps {
  logs: ConnectionLogEntry[]
  totalCount: number
}

export function ConnectionLogTable({
  logs,
  totalCount
}: ConnectionLogTableProps) {
  return (
    <div
      className="log-table-container"
      tabIndex={0}
      role="region"
      aria-label="接続ログテーブル">
      <table className="log-table" aria-label="接続ログ">
        <thead>
          <tr>
            <th scope="col">時刻</th>
            <th scope="col">メソッド</th>
            <th scope="col">ステータス</th>
            <th scope="col">タイプ</th>
            <th scope="col">URL</th>
            <th scope="col">IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className={log.error ? "log-error" : ""}>
              <td className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </td>
              <td className="log-method">{log.method}</td>
              <td
                className={`log-status ${log.statusCode && log.statusCode >= 400 ? "status-error" : ""}`}>
                {log.error ? (
                  <span
                    title={log.error}
                    aria-label={`エラー: ${log.error}`}>
                    ERR
                  </span>
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
          {logs.length === 0 && (
            <tr>
              <td colSpan={6} className="log-empty">
                {totalCount === 0
                  ? "ログがありません"
                  : "フィルタに一致するログがありません"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
