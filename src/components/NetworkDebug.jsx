import React, { useEffect, useRef, useState } from "react";
import { useToast } from "./toast/ToastProvider.jsx";

export default function NetworkDebug() {
  const [calls, setCalls] = useState([]);
  const { push } = useToast();
  const lastToast = useRef(0);

  useEffect(() => {
    function onCall(e) {
      setCalls([...e.detail]);
    }
    function onErr(e) {
      const now = Date.now();
      if (now - lastToast.current > 5000) {
        lastToast.current = now;
        push({ variant: "error", title: "Network error", description: e.detail.message });
      }
    }
    window.addEventListener("api:call", onCall);
    window.addEventListener("api:network-error", onErr);
    return () => {
      window.removeEventListener("api:call", onCall);
      window.removeEventListener("api:network-error", onErr);
    };
  }, [push]);

  if (!import.meta.env.DEV) return null;

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, background: "#000a", color: "#fff", padding: 8, fontSize: 11, maxWidth: 300, zIndex: 1000 }}>
      {calls.slice(-20).reverse().map((c, i) => (
        <div key={i}>
          {c.method} {c.url} — {c.status}
        </div>
      ))}
    </div>
  );
}
