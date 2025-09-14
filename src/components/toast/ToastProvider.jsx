// juribly-web/src/components/toast/ToastProvider.jsx
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext({ push: () => {}, remove: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  const push = useCallback((toast) => {
    const id = ++idRef.current;
    const duration = toast.duration ?? 4000;
    setToasts(arr => [...arr, {
      id,
      title: toast.title || "",
      description: toast.description || "",
      variant: toast.variant || "default",
      duration
    }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div style={{ position: "fixed", right: 12, top: 12, display: "grid", gap: 8, zIndex: 1000 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ padding: 10, borderRadius: 8, background: "#111", color: "#fff", minWidth: 220, boxShadow: "0 6px 20px rgba(0,0,0,.3)" }}>
            {t.title && <div style={{ fontWeight: 700 }}>{t.title}</div>}
            {t.description && <div style={{ fontSize: 12, opacity: .8 }}>{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
