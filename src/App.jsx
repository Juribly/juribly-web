import React, { useEffect, useState } from "react";
import api from "./lib/api.ts";
import ProfileForm from "./components/ProfileForm.jsx";
import PostForm from "./components/PostForm.jsx";
import CourtroomShell from "./components/CourtroomShell.jsx";

/* ---------------- Tabs ---------------- */
function Tabs({ tab, setTab }) {
  const tabs = ["Feed", "Profiles", "Posts", "Courtroom"];
  return (
    <div style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #d8e0ea", background: "#f6f8fb" }}>
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ccd5e0",
            background: tab === t ? "#e7ecf3" : "white",
            cursor: "pointer",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Feed ---------------- */
function Feed({ trials, loading, err, reload, onJoin }) {
  return (
    <div style={{ padding: 12, color: "#1e2a3a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Trials</h2>
        <button onClick={reload} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccd5e0" }}>
          Refresh
        </button>
      </div>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "#b00020" }}>{String(err)}</p>}
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {(trials || []).map((t) => (
          <div key={t.id} style={{ padding: 12, border: "1px solid #e1e7ef", borderRadius: 12, background: "white" }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>{t.description}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              State: {t.state} • Accused: {t?.roles?.accused_id || "—"} • Audience: {(t?.roles?.audience_ids || []).length}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              Post ref: {t?.post_ref?.post_id || "—"} • Trial ID: {t.id}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => onJoin(t.id, "Audience")}
                style={{ padding: "6px 10px", borderRadius: 8, background: "black", color: "white" }}
              >
                Join in Courtroom
              </button>
              <button
                onClick={() => onJoin(t.id, "Judge")}
                style={{ padding: "6px 10px", borderRadius: 8, background: "#e7ecf3", color: "#111" }}
              >
                Join as Judge
              </button>
              <button
                onClick={() => onJoin(t.id, "Accused")}
                style={{ padding: "6px 10px", borderRadius: 8, background: "#ffe9e9", color: "#8a1c1c", border: "1px solid #f3cfcf" }}
              >
                Join as Accused
              </button>
            </div>
          </div>
        ))}
        {(!trials || trials.length === 0) && !loading && <div>No trials yet.</div>}
      </div>
    </div>
  );
}

/* ---------------- Posts ---------------- */
function Posts({ currentProfile, onAccuseMade }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [accuseErr, setAccuseErr] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/posts");
      setPosts(res.posts || []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function accuse(postId) {
    setAccuseErr("");
    if (!currentProfile?.id) {
      setAccuseErr("Create/select your profile first.");
      return;
    }
    try {
      const { trial } = await api.post("/api/accuse", { post_id: postId, accuser_id: currentProfile.id });
      onAccuseMade?.(trial);
    } catch (e) {
      setAccuseErr(String(e?.message || e));
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, padding: 12 }}>
      <PostForm authorId={currentProfile?.id} onCreated={() => load()} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>All Posts</h3>
          <button onClick={load} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccd5e0" }}>
            Refresh
          </button>
        </div>
        {accuseErr && <p style={{ color: "#b00020" }}>{accuseErr}</p>}
        {loading && <p>Loading…</p>}
        {err && <p style={{ color: "#b00020" }}>{err}</p>}
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          {posts.map((p) => (
            <div key={p.id} style={{ padding: 12, border: "1px solid #e1e7ef", borderRadius: 12, background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>
                  @{p.author_summary?.handle || "unknown"}{" "}
                  <span style={{ opacity: 0.6, fontWeight: 400 }}>• {p.id}</span>
                </div>
                {p.author_summary?.display_name && <div style={{ opacity: 0.7 }}>{p.author_summary.display_name}</div>}
              </div>
              <div style={{ marginTop: 6 }}>{p.content || <i>(media-only)</i>}</div>
              {p.media_url && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                  Media: {p.media_type} • {p.media_url}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => accuse(p.id)}
                  style={{ padding: "6px 10px", borderRadius: 8, background: "black", color: "white" }}
                >
                  Accuse → Create Trial & Join
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && !loading && <div>No posts yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  const [tab, setTab] = useState("Feed");
  const [currentProfile, setCurrentProfile] = useState(null);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Which trial to show in the Courtroom tab
  const [activeTrialId, setActiveTrialId] = useState("");
  const [role, setRole] = useState("Audience");

  async function loadTrials() {
    try {
      setLoading(true);
      setErr("");
      const res = await api.get("/api/trials");
      setTrials(res.trials || []);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadTrials();
  }, []);

  function handleAccuseMade(trial) {
    setActiveTrialId(trial.id);
    setRole("Audience");
    setTab("Courtroom");
    loadTrials();
  }

  function handleJoinFromFeed(trialId, roleWanted) {
    setActiveTrialId(trialId);
    setRole(roleWanted || "Audience");
    setTab("Courtroom");
  }

  return (
    <div style={{ height: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <Tabs tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflow: "auto" }}>
        {tab === "Feed" && (
          <Feed
            trials={trials}
            loading={loading}
            err={err}
            reload={loadTrials}
            onJoin={handleJoinFromFeed}
          />
        )}

        {tab === "Profiles" && (
          <div style={{ padding: 12 }}>
            <ProfileForm onReady={(p) => setCurrentProfile(p)} />
            {currentProfile && (
              <div style={{ marginTop: 12, fontSize: 14, color: "#1e2a3a" }}>
                Current profile: <b>@{currentProfile.handle || currentProfile.username}</b> (ID: {currentProfile.id})
              </div>
            )}
          </div>
        )}

        {tab === "Posts" && <Posts currentProfile={currentProfile} onAccuseMade={handleAccuseMade} />}

        {tab === "Courtroom" && (
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600 }}>Role:</span>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setRole(newRole);
                  // IMPORTANT: tell the 3D shell/server the role changed (reseats & rebroadcasts)
                  window.dispatchEvent(new CustomEvent("juribly:role-change", { detail: { role: newRole } }));
                }}
                style={{ padding: 6, borderRadius: 8, border: "1px solid #ccd5e0" }}
              >
                <option>Audience</option>
                <option>Accused</option>
                <option>Judge</option>
              </select>
              <span style={{ opacity: 0.6 }}>Trial: {activeTrialId || "—"}</span>
            </div>

            <CourtroomShell trialId={activeTrialId} role={role} currentProfile={currentProfile} />
          </div>
        )}
      </div>
    </div>
  );
}
