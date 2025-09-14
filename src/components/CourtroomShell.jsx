// juribly-web/src/components/CourtroomShell.jsx
import React, { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import CourtroomScene from "../3d/CourtroomScene.jsx";
import RemoteCrowd from "./RemoteCrowd.jsx";
import useMultiplayer from "../hooks/useMultiplayer.js";

export default function CourtroomShell({ trialId="demo-1", role="Audience", currentProfile=null }) {
  const { connected, self, others, joinRoom, updatePose } = useMultiplayer();
  const selfSocketId = useRef(null);
  const name = currentProfile?.display_name || currentProfile?.handle || "Guest";
  const handle = currentProfile?.handle || null;
  const profile_id = currentProfile?.id || null;

  useEffect(() => {
    joinRoom({ trialId, role, name, handle, profile_id });
  }, [trialId, role, name, handle, profile_id, joinRoom]);

  useEffect(() => {
    if (self?.socketId) selfSocketId.current = self.socketId;
  }, [self]);

  return (
    <div style={{ position: "relative", height: "70vh", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#0b0b0b" }}>
      <div style={{ position: "absolute", zIndex: 10, top: 8, left: 8, fontSize: 12, color: connected ? "#16a34a" : "#ef4444" }}>
        {connected ? "● connected" : "○ offline"} — trial <b>{trialId}</b>
      </div>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 2.5, 6], fov: 50 }}>
        {/* lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        {/* ground */}
        <mesh rotation-x={-Math.PI/2} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#202020" />
        </mesh>
        {/* local player */}
        <CourtroomScene trialId={trialId} role={role} name={name} onPose={(pose)=>updatePose({ trialId, pose })} />
        {/* remotes */}
        <RemoteCrowd participants={others} selfSocketId={selfSocketId.current} />
      </Canvas>
    </div>
  );
}
