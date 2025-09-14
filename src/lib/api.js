// juribly-web/src/lib/api.js — FULL REPLACEMENT
const API_BASE =
  (import.meta?.env && import.meta.env.VITE_API_URL) || "http://127.0.0.1:3000";

async function handle(res) {
  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
    const msg = text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ── Profiles ───────────────────────────────────────────────
export function upsertProfile(payload) {
  // payload: { id?, handle, display_name?, avatar_url?, bio? }
  return fetch(`${API_BASE}/api/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload || {}),
  }).then(handle);
}

export function getProfile(handle) {
  return fetch(`${API_BASE}/api/profiles/${encodeURIComponent(handle)}`, {
    headers: { "Accept": "application/json" },
  }).then(handle);
}

// ── Posts ─────────────────────────────────────────────────
export function createPost(payload) {
  // payload: { author_id, content?, media_url?, media_type? }
  return fetch(`${API_BASE}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload || {}),
  }).then(handle);
}

export function getPosts() {
  return fetch(`${API_BASE}/api/posts`, {
    headers: { "Accept": "application/json" },
  }).then(handle);
}

// ── Trials ────────────────────────────────────────────────
export function getTrials() {
  return fetch(`${API_BASE}/api/trials`, {
    headers: { "Accept": "application/json" },
  }).then(handle);
}

export function getTrial(id) {
  return fetch(`${API_BASE}/api/trials/${encodeURIComponent(id)}`, {
    headers: { "Accept": "application/json" },
  }).then(handle);
}

export function createTrial(payload) {
  // optional: { title, description, accused_profile_id?, post_id? }
  return fetch(`${API_BASE}/api/trials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload || {}),
  }).then(handle);
}

// ── Accuse ────────────────────────────────────────────────
export function accusePost({ post_id, accuser_id }) {
  return fetch(`${API_BASE}/api/accuse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ post_id, accuser_id }),
  }).then(handle);
}

export { API_BASE };
