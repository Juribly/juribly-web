// GameScene.jsx
// Example scene wiring: colliders, player, audience cam.
// Mark arena walls/ground meshes with userData.collidable = true OR name "COLLIDER_*".

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThirdPersonController from "../controls/ThirdPersonController";
import AudienceFreecam from "../controls/AudienceFreecam";

function Ground() {
  return (
    <mesh name="COLLIDER_GROUND" userData={{ collidable: true }} receiveShadow rotation-x={-Math.PI / 2}>
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#3b3b3b" />
    </mesh>
  );
}

function SimpleArena() {
  return (
    <group>
      {/* Four walls marked collidable */}
      <mesh name="COLLIDER_WALL_N" userData={{ collidable: true }} position={[0, 2, -20]}>
        <boxGeometry args={[40, 4, 0.5]} />
        <meshStandardMaterial attach="material" color="#555" />
      </mesh>
      <mesh name="COLLIDER_WALL_S" userData={{ collidable: true }} position={[0, 2, 20]}>
        <boxGeometry args={[40, 4, 0.5]} />
        <meshStandardMaterial attach="material" color="#555" />
      </mesh>
      <mesh name="COLLIDER_WALL_E" userData={{ collidable: true }} position={[20, 2, 0]}>
        <boxGeometry args={[0.5, 4, 40]} />
        <meshStandardMaterial attach="material" color="#555" />
      </mesh>
      <mesh name="COLLIDER_WALL_W" userData={{ collidable: true }} position={[-20, 2, 0]}>
        <boxGeometry args={[0.5, 4, 40]} />
        <meshStandardMaterial attach="material" color="#555" />
      </mesh>
    </group>
  );
}

function PlayerModel(props) {
  return (
    <group {...props}>
      {/* A simple capsule-like player proxy */}
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 1.1, 8, 16]} />
        <meshStandardMaterial color="#d4b300" metalness={0.1} roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function GameScene() {
  const colliderRootRef = useRef();
  const playerRef = useRef();

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 3, 8], fov: 50 }}>
      <color attach="background" args={["#0e0f12"]} />
      <ambientLight intensity={0.5} />
      <directionalLight castShadow position={[10, 12, 6]} intensity={1} />
      <group ref={colliderRootRef}>
        <Ground />
        <SimpleArena />
        <PlayerModel ref={playerRef} position={[0, 1.1, 0]} />
      </group>

      {/* Choose ONE of the following at a time; comment the other */}
      <ThirdPersonController modelRef={playerRef} colliderRootRef={colliderRootRef} />
      {/* <AudienceFreecam enabled colliderRootRef={colliderRootRef} /> */}

      {/* Optional dev control: keep for quick orbit inspection */}
      {/* <OrbitControls enablePan enableRotate enableZoom /> */}
    </Canvas>
  );
}
