// juribly-web/src/components/BuddyModel.jsx
import React from "react";
import { Text } from "@react-three/drei";

export default function BuddyModel({ color="#7aa7ff", role="Audience", label="Guest" }) {
  const primary = role === "Judge" ? "#f7c85f" : role === "Accused" ? "#ff6b6b" : color;

  return (
    <group>
      {/* body */}
      <mesh castShadow position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.7, 8, 16]} />
        <meshStandardMaterial color={primary} />
      </mesh>
      {/* head */}
      <mesh castShadow position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#f2d6bd" />
      </mesh>
      {/* label */}
      <Text position={[0, 1.65, 0]} fontSize={0.2} anchorX="center" anchorY="bottom" color="#fff" outlineWidth={0.02} outlineColor="#000">
        {label}
      </Text>
    </group>
  );
}
