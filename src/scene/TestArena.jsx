// TestArena.jsx
// Minimal arena with floor and walls for manual collision testing.

import React from 'react';

export default function TestArena() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} userData={{ collidable: true }}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#777" />
      </mesh>

      {/* Walls */}
      <mesh position={[0, 1, -10]} userData={{ collidable: true }}>
        <boxGeometry args={[20, 2, 1]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[0, 1, 10]} userData={{ collidable: true }}>
        <boxGeometry args={[20, 2, 1]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[10, 1, 0]} userData={{ collidable: true }}>
        <boxGeometry args={[1, 2, 20]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[-10, 1, 0]} userData={{ collidable: true }}>
        <boxGeometry args={[1, 2, 20]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

