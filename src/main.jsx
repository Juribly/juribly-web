// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import TopErrorBoundary from "./components/TopErrorBoundary.jsx";

window.addEventListener("error", (e) => {
  console.error("Global error:", e?.error || e?.message || e);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise:", e?.reason || e);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TopErrorBoundary>
      <App />
    </TopErrorBoundary>
  </React.StrictMode>
);
