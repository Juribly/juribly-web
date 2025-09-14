import React, { useState, useEffect } from "react";
import socket from "../lib/socket.js";

export default function CourtroomJoin({ currentProfile }) {
  const [trialId, setTrialId] = useState("");
  const [role, setRole] = useState("Audience");
  const [status, setStatus] = useState("");
  const [seat, setSeat] = useState(null);

  useEffect(() => {
    function onJoined(payload) { setStatus(`Joined room as ${payload.role}.`); }
    function onSeat(payload) {
      if (payload.ok) setSeat(payload.seat);
      else setStatus(payload.error || "Seat failed");
    }
    socket.on("room:joined", onJoined);
    socket.on("seat:assigned", onSeat);
    return () => {
      socket.off("room:joined", onJoined);
      socket.off("seat:assigned", onSeat);
    };
  }, []);

  function join() {
    if (!trialId.trim()) { setStatus("Enter a Trial ID (from Feed)."); return; }
    socket.emit("room:join", {
      trialId: trialId.trim(),
      role,
      name: currentProfile?.display_name || currentProfile?.handle || "Guest",
      profile_id: currentProfile?.id || null
    });
  }

  function requestSeat() {
    if (!trialId.trim()) { setStatus("Enter a Trial ID first."); return; }
    socket.emit("seat:request", { trialId: trialId.trim() });
  }

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
      <h3 style={{ margin: 0 }}>Join a Courtroom</h3>
      {status && <div style={{ color: "#1e2a3a" }}>{status}</div>}
      {seat && (
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          Seat → row {seat.row}, index {seat.index} (x:{seat.x}, z:{seat.z})
        </div>
      )}
      <input
        placeholder="Trial ID (copy it from Feed)"
        value={trialId}
        onChange={(e) => setTrialId(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccd5e0" }}>
        <option>Audience</option>
        <option>Accused</option>
        <option>Judge</option>
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={join} style={{ padding: "8px 12px", borderRadius: 10, background: "black", color: "white" }}>
          Join
        </button>
        <button onClick={requestSeat} style={{ padding: "8px 12px", borderRadius: 10, background: "#e7ecf3", color: "#111" }}>
          Request seat
        </button>
      </div>
      {!currentProfile && <div style={{ fontSize: 12, opacity: 0.7 }}>
        Tip: create a profile first so your name shows up in court.
      </div>}
    </div>
  );
}
