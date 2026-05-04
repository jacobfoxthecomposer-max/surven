import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/**
 * Catches render-time crashes (bad URL inside JSX, undefined access, etc.) so
 * the side panel shows a recovery card instead of a blank screen. Without this
 * any error inside App.tsx silently kills the entire UI.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[Surven] Side panel render crash:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "16px",
            fontFamily: "var(--font-inter), -apple-system, sans-serif",
            background: "#FEE2E2",
            border: "1px solid #B54631",
            borderRadius: "6px",
            margin: "12px",
            color: "#3D3F3D",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", color: "#B54631" }}>
            Surven hit an unexpected error
          </div>
          <div style={{ fontSize: "12px", marginBottom: "10px", lineHeight: 1.4 }}>
            The side panel crashed while rendering. Reload to recover.
          </div>
          <details style={{ fontSize: "11px", marginBottom: "10px" }}>
            <summary style={{ cursor: "pointer", color: "#666" }}>Technical detail</summary>
            <pre
              style={{
                marginTop: "6px",
                padding: "8px",
                background: "#1A1C1A",
                color: "#F2EEE3",
                borderRadius: "4px",
                fontSize: "10px",
                overflow: "auto",
                maxHeight: "120px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
              {"\n"}
              {this.state.error.stack}
            </pre>
          </details>
          <button
            onClick={() => location.reload()}
            style={{
              padding: "8px 12px",
              background: "#B54631",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload side panel
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
