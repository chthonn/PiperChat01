import { Component } from "react";

/**
 * ErrorBoundary — catches runtime errors in the React tree and
 * displays a visible fallback instead of a blank screen.
 * Without this, errors in AnimatePresence children silently
 * produce an empty DOM.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "#f0f0f5",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            gap: "1rem",
          }}
        >
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <pre
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "0.75rem",
              padding: "1rem 1.5rem",
              color: "#fca5a5",
              fontSize: "0.8rem",
              maxWidth: "600px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 1.4rem",
              borderRadius: "0.6rem",
              border: "none",
              background: "linear-gradient(135deg,#a855f7,#7c3aed)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
