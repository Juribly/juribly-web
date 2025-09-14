import React, { useState } from "react";
import api from "../lib/api.ts";

export default function ProfileForm({ onReady }) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function createOrUpdate(e) {
    e.preventDefault();
    setMsg("");
    if (!handle.trim()) { setMsg("Handle is required."); return; }
    try {
      setBusy(true);
      const prof = await api.post("/api/profiles", {
        handle: handle.trim(),
        display_name: displayName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      setMsg(`Profile ready. ID: ${prof.id}  Handle: @${prof.handle}`);
      onReady?.(prof);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function loadByHandle() {
    setMsg("");
    if (!handle.trim()) { setMsg("Enter a handle to fetch."); return; }
    try {
      setBusy(true);
      const prof = await api.get(`/api/profiles/${encodeURIComponent(handle.trim())}`);
      setDisplayName(prof.display_name || "");
      setAvatarUrl(prof.avatar_url || "");
      setBio(prof.bio || "");
      setMsg(`Loaded existing profile. ID: ${prof.id}`);
      onReady?.(prof);
    } catch (e) {
      setMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={createOrUpdate} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
      <h3 style={{ margin: 0 }}>Create / Load Profile</h3>
      {msg && <div style={{ color: "#1e2a3a" }}>{msg}</div>}

      <input placeholder="Handle (e.g., liam)" value={handle} onChange={(e) => setHandle(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }} />

      <input placeholder="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }} />

      <input placeholder="Avatar URL (optional)" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }} />

      <textarea placeholder="Bio (optional)" value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} style={{ padding: "10px 14px", borderRadius: 10, background: "black", color: "white" }}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        <button type="button" onClick={loadByHandle} disabled={busy}
          style={{ padding: "10px 14px", borderRadius: 10, background: "#e7ecf3", color: "#111" }}>
          Load by handle
        </button>
      </div>
    </form>
  );
}
