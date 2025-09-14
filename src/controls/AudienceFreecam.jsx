// AudienceFreecam.jsx
// Lightweight FPS-style spectator camera with pitch clamp, smoothing, and collision.

import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { gatherColliders, keepAboveGround, sweepAndSlide } from "./CameraCollision";
import { clamp, damp } from "../lib/math";

const _next = new THREE.Vector3();
const _move = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const SPEED = 7.0;
const BOOST = 2.0;
const SMOOTH = 14;
const CAM_RADIUS = 0.35;

export default function AudienceFreecam({ enabled = true, start = new THREE.Vector3(0, 3, 8), colliderRootRef }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keys = useRef({});
  const colliders = useMemo(
    () => (colliderRootRef?.current ? gatherColliders(colliderRootRef.current) : []),
    [colliderRootRef]
  );
  const dom = gl.domElement;

  useEffect(() => {
    camera.position.copy(start);
    camera.rotation.set(0, 0, 0);
    yaw.current = 0;
    pitch.current = 0;
  }, [camera, start]);

  // Input
  useEffect(() => {
    if (!enabled) return;
    const onPointerMove = (e) => {
      if (document.pointerLockElement !== dom) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      yaw.current -= dx * 0.0025;
      pitch.current -= dy * 0.0025;
      // clamp pitch to avoid flipping
      const lim = THREE.MathUtils.degToRad(80);
      pitch.current = clamp(pitch.current, -lim, lim);
    };
    const onClick = () => {
      if (document.pointerLockElement !== dom) dom.requestPointerLock();
    };
    const onKeyDown = (e) => (keys.current[e.code] = true);
    const onKeyUp = (e) => (keys.current[e.code] = false);

    dom.addEventListener("mousemove", onPointerMove);
    dom.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      dom.removeEventListener("mousemove", onPointerMove);
      dom.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dom, enabled]);

  useFrame((_, dt) => {
    if (!enabled) return;
    dt = Math.min(dt, 1 / 30);

    // Build forward/right vectors from yaw/pitch
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"));
    _dir.set(0, 0, -1).applyQuaternion(q).normalize();
    const right = new THREE.Vector3().copy(_dir).cross(_up).normalize();

    // WASD + QE up/down
    const moveZ = (keys.current["KeyW"] ? 1 : 0) - (keys.current["KeyS"] ? 1 : 0);
    const moveX = (keys.current["KeyD"] ? 1 : 0) - (keys.current["KeyA"] ? 1 : 0);
    const moveY = (keys.current["KeyE"] ? 1 : 0) - (keys.current["KeyQ"] ? 1 : 0);
    const boost = keys.current["ShiftLeft"] || keys.current["ShiftRight"] ? BOOST : 1;

    _move.set(0, 0, 0)
      .addScaledVector(_dir, moveZ)
      .addScaledVector(right, moveX)
      .addScaledVector(_up, moveY);

    if (_move.lengthSq() > 1e-6) _move.normalize().multiplyScalar(SPEED * boost * dt);

    // Target position (pre-collision)
    _next.copy(camera.position).add(_move);

    // Collision: sweep and slide, then keep above ground a bit
    sweepAndSlide(camera.position, _next, colliders, CAM_RADIUS, 4);
    keepAboveGround(_next, colliders, 0.05);

    // Smooth camera to target to avoid jitter
    const s = damp(0, 1, SMOOTH, dt);
    camera.position.lerp(_next, s);
    camera.quaternion.slerp(q, s);
  });

  return null;
}

