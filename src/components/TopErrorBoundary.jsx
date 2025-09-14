// src/components/TopErrorBoundary.jsx
import React from "react";

export default class TopErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    // Show in console too
    // eslint-disable-next-line no-console
    console.error("TopErrorBoundary caught:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{
          padding: 16,
          margin: 24,
          background: "#111827",
          color: "white",
          borderRadius: 12,
          border: "1px solid #374151",
          fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial"
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>App crashed</div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.9 }}>
            {String(this.state.err?.message || this.state.err || "Unknown error")}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Press <b>F12</b> → Console to see the full stack. Fixing a file will hot-reload automatically.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
