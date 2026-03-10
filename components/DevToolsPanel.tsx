import { useState } from "react"

import type { ConnectionLogEntry } from "~lib/types"

import { ConnectionLogTable } from "./ConnectionLogTable"

interface DevToolsPanelProps {
  devMode: boolean
  logs: ConnectionLogEntry[]
}

export function DevToolsPanel({ devMode, logs }: DevToolsPanelProps) {
  const [logFilter, setLogFilter] = useState("")

  const filteredLogs = logs
    .filter(
      (log) =>
        !logFilter ||
        log.url.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.method.toLowerCase().includes(logFilter.toLowerCase()) ||
        log.type.toLowerCase().includes(logFilter.toLowerCase()) ||
        (log.error &&
          log.error.toLowerCase().includes(logFilter.toLowerCase()))
    )
    .reverse()

  return (
    <div className="devtools-panel">
      <h2>接続ログ</h2>
      {!devMode ? (
        <div className="empty-state">
          開発者モードを有効にすると接続ログの記録が開始されます
        </div>
      ) : (
        <>
          <div className="log-toolbar">
            <label htmlFor="log-filter-input" className="sr-only">
              ログをフィルタ
            </label>
            <input
              id="log-filter-input"
              type="text"
              className="log-filter"
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="URL、メソッド、タイプでフィルタ..."
            />
            <span className="log-count" aria-live="polite">
              {filteredLogs.length} / {logs.length} 件
            </span>
          </div>
          <ConnectionLogTable logs={filteredLogs} totalCount={logs.length} />
        </>
      )}
    </div>
  )
}
