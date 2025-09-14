import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import useMultiplayer from "../hooks/useMultiplayer";
// If you have CuteBuddy, you can import and use it below.
// import CuteBuddy from "./CuteBuddy";

const damp = THREE.MathUtils.damp;

export default function CourtroomMultiplayer({
  trialId,
  desiredRole = "Audience",
  profile_id,
  name,
  handle,
  playerRef, // pass your local player ref if you have one
}) {
  const { joinRoom, updatePose, others } = useMultiplayer();

  // join the room when this component mounts / changes
  useEffect(() => {
    joinRoom(trialId, desiredRole, { profile_id, name, handle });
  }, [trialId, desiredRole, profile_id, name, handle, joinRoom]);

  // send local player pose ~20Hz (only if playerRef provided)
  useFrame(() => {
    if (!playerRef?.current) return;
    const p = playerRef.current.position;
    const ry = playerRef.current.rotation?.y || 0;
    updatePose({ x: p.x, y: p.y, z: p.z, ry });
  });

  // Smooth interpolation for remote players
  const remoteRefs = useRef({});
  const ensureRef = (id) => {
    if (!remoteRefs.current[id]) {
      remoteRefs.current[id] = { pos: new THREE.Vector3(), rotY: 0 };
    }
    return remoteRefs.current[id];
  };

  useFrame((_, dt) => {
    const k = Math.min(1, dt);
    for (const p of others) {
      const rr = ensureRef(p.socketId);
      rr.pos.x = damp(rr.pos.x, p.pose.x, 8, k);
      rr.pos.y = damp(rr.pos.y, p.pose.y, 8, k);
      rr.pos.z = damp(rr.pos.z, p.pose.z, 8, k);
      rr.rotY = damp(rr.rotY, p.pose.ry, 8, k);
    }
  });

  const remotes = useMemo(() => others.map((p) => ({ id: p.socketId, data: p })), [others]);

  return (
    <>
      {remotes.map(({ id, data }) => {
        const rr = ensureRef(id);
        return (
          <group key={id} position={rr.pos} rotation={[0, rr.rotY, 0]}>
            {/* If you have CuteBuddy, uncomment this block and remove the cube below.
            <CuteBuddy
              role={data.role}
              name={data.display_name}
              getSpeed={() => 0}
              emoteState={data.emote}
            />
            */}
            <mesh>
              <boxGeometry args={[0.3, 0.9, 0.3]} />
              <meshStandardMaterial />
            </mesh>
          </group>
        );
      })}
    </>
  );
}
