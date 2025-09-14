// juribly-web/src/components/RemoteCrowd.jsx
import React from "react";
import BuddyModel from "./BuddyModel.jsx";

export default function RemoteCrowd({ participants = [], selfSocketId = null }) {
  return (
    <group>
      {participants
        .filter(p => p.socketId !== selfSocketId)
        .map(p => {
          const pose = p.pose || {};
          const x = pose.x ?? 0, y = pose.y ?? 0.9, z = pose.z ?? 0, ry = pose.ry ?? 0;
          return (
            <group key={p.socketId} position={[x, y, z]} rotation={[0, ry, 0]}>
              <BuddyModel role={p.role} color={p.color} label={`@${p.handle || p.name || "guest"}`} />
            </group>
          );
        })}
    </group>
  );
}
