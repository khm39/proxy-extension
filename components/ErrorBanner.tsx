import type { ProxyError } from "~lib/types"

interface ErrorBannerProps {
  error: ProxyError
  onDismiss: () => void
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <div
      className={`error-banner ${error.fatal ? "fatal" : ""}`}
      role="alert"
      aria-live="assertive">
      <div className="error-content">
        <span className="error-icon" aria-hidden="true">
          {error.fatal ? "!!" : "!"}
        </span>
        <div className="error-text">
          <span className="error-message">
            {error.fatal && <span className="sr-only">重大なエラー: </span>}
            {error.message}
          </span>
          <span className="error-time">
            {new Date(error.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <button
        className="error-dismiss"
        onClick={onDismiss}
        aria-label="エラーメッセージを閉じる">
        ×
      </button>
    </div>
  )
}
