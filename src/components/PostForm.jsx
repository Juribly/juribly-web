import React, { useState } from "react";
import api from "../lib/api.ts";

export default function PostForm({ authorId, onCreated }) {
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!authorId) return setErr("Please create/select a profile first.");
    if (!content && !mediaUrl) return setErr("Write something or add a media URL.");

    try {
      setBusy(true);
      const post = await api.post("/api/posts", {
        author_id: authorId,
        content: content.trim(),
        media_url: mediaUrl.trim() || null,
        media_type: mediaUrl ? (mediaType || "image") : null,
      });
      setContent(""); setMediaUrl(""); setMediaType("");
      onCreated?.(post);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 8, maxWidth: 520 }}>
      <h3 style={{ margin: 0 }}>Create a Post</h3>
      {err && <div style={{ color: "#b00020" }}>{err}</div>}

      <textarea
        placeholder="Say something…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }}
      />

      <input
        placeholder="Media URL (optional)"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }}
      />

      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value)}
        style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }}
        disabled={!mediaUrl}
      >
        <option value="">Choose media type…</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
      </select>

      <button
        disabled={busy}
        style={{ padding: "10px 14px", borderRadius: 10, background: "black", color: "white" }}
      >
        {busy ? "Posting…" : "Post"}
      </button>
    </form>
  );
}
