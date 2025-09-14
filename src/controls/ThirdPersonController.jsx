// ThirdPersonController.jsx
// Character always faces movement direction. Smooth follow camera with occlusion handling.

import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { resolveCameraOcclusion, gatherColliders } from "./CameraCollision";

const _v = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _targetQuat = new THREE.Quaternion();

const SPEED = 5.2;          // m/s
const ACCEL = 18;           // m/s^2
const TURN_SMOOTH = 12;     // higher = snappier turn
const CAM_DISTANCE = 4.5;
const CAM_HEIGHT = 1.7;
const CAM_LAG = 8;          // camera follow smoothing
const CAM_RADIUS = 0.28;

function useKeys() {
  const pressed = useRef({});

  React.useEffect(() => {
    const down = (e) => (pressed.current[e.code] = true);
    const up = (e) => (pressed.current[e.code] = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return pressed;
}

/**
 * Props:
 * - modelRef: ref to the character mesh/group (pivot at feet)
 * - colliderRootRef: ref to scene root (used to collect colliders)
 */
export default function ThirdPersonController({ modelRef, colliderRootRef }) {
  const { camera } = useThree();
  const keys = useKeys();
  const vel = useRef(new THREE.Vector3());
  const colliders = useMemo(
    () => (colliderRootRef?.current ? gatherColliders(colliderRootRef.current) : []),
    [colliderRootRef]
  );

  // Start camera behind the player
  React.useEffect(() => {
    if (!modelRef?.current) return;
    const p = modelRef.current.getWorldPosition(_v.set(0, 0, 0));
    camera.position.copy(p).add(new THREE.Vector3(0, CAM_HEIGHT, CAM_DISTANCE));
    camera.lookAt(p);
  }, [camera, modelRef]);

  useFrame((_, dt) => {
    if (!modelRef?.current) return;
    dt = Math.min(dt, 1 / 30); // clamp long frames

    // --- Movement input relative to camera yaw
    const moveZ = (keys.current["KeyW"] ? 1 : 0) + (keys.current["ArrowUp"] ? 1 : 0) - (keys.current["KeyS"] ? 1 : 0) - (keys.current["ArrowDown"] ? 1 : 0);
    const moveX = (keys.current["KeyD"] ? 1 : 0) + (keys.current["ArrowRight"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0) - (keys.current["ArrowLeft"] ? 1 : 0);

    // Camera basis on ground plane
    camera.getWorldDirection(_forward).setY(0).normalize();
    _right.copy(_forward).cross(_up).negate().normalize();

    const input = _v.set(0, 0, 0).addScaledVector(_forward, moveZ).addScaledVector(_right, moveX);
    if (input.lengthSq() > 1e-6) input.normalize();

    // Accelerate towards desired velocity
    const desired = _v.clone().copy(input).multiplyScalar(SPEED);
    vel.current.lerp(desired, 1 - Math.exp(-ACCEL * dt));

    // Update position
    const m = modelRef.current;
    m.position.addScaledVector(vel.current, dt);

    // --- Face where you're walking
    if (vel.current.lengthSq() > 1e-5) {
      const heading = Math.atan2(vel.current.x, vel.current.z);
      _targetQuat.setFromAxisAngle(_up, heading);
      _quat.copy(m.quaternion).slerp(_targetQuat, 1 - Math.exp(-TURN_SMOOTH * dt));
      m.quaternion.copy(_quat);
    }

    // --- Smooth follow camera (with occlusion / ground protection)
    // Camera target is head height
    _targetPos.copy(m.position).addScaledVector(_up, CAM_HEIGHT * 0.6);
    // desired boom position: behind character (based on its facing)
    const behind = _v.set(0, 0, 1).applyQuaternion(m.quaternion);
    _camDesired.copy(_targetPos)
      .addScaledVector(_up, CAM_HEIGHT * 0.25)
      .addScaledVector(behind, CAM_DISTANCE);

    // Resolve occlusion (push outward if blocked)
    resolveCameraOcclusion(_targetPos, _camDesired, colliders, CAM_RADIUS);

    // Smooth to position
    _camPos.copy(camera.position).lerp(_camDesired, 1 - Math.exp(-CAM_LAG * dt));
    camera.position.copy(_camPos);
    camera.lookAt(_targetPos);
  });

  return null;
}
