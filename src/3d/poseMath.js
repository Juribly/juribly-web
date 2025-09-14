import * as THREE from "three";

export const damp = THREE.MathUtils.damp;
export const clamp = THREE.MathUtils.clamp;

const ELBOW_X_MIN = -2.4;
const ELBOW_X_MAX = 0.2;
const JOINT_LIMIT = 1.5;
const BASE_SHOULDER = 0.78;
const SHOULDER_OFFSET = 0.04;

export function poseArm(u, f, h, { u: ur = [0, 0, 0], f: fr = [0, 0, 0], h: hr = [0, 0, 0] }, dt, lambda = 14) {
  if (u.current) {
    u.current.rotation.x = damp(u.current.rotation.x, clamp(ur[0], -Math.PI / 2, Math.PI / 2), lambda, dt);
    u.current.rotation.y = damp(u.current.rotation.y, clamp(ur[1], -1.2, 1.2), lambda, dt);
    u.current.rotation.z = damp(u.current.rotation.z, ur[2], lambda, dt);
  }
  if (f.current) {
    const fx = clamp(fr[0], ELBOW_X_MIN, ELBOW_X_MAX);
    f.current.rotation.x = damp(f.current.rotation.x, fx, lambda, dt);
    f.current.rotation.y = damp(f.current.rotation.y, clamp(fr[1], -JOINT_LIMIT, JOINT_LIMIT), lambda, dt);
    f.current.rotation.z = damp(f.current.rotation.z, clamp(fr[2], -JOINT_LIMIT, JOINT_LIMIT), lambda, dt);
  }
  if (h.current) {
    h.current.rotation.x = damp(h.current.rotation.x, clamp(hr[0], -JOINT_LIMIT, JOINT_LIMIT), lambda, dt);
    h.current.rotation.y = damp(h.current.rotation.y, clamp(hr[1], -JOINT_LIMIT, JOINT_LIMIT), lambda, dt);
    h.current.rotation.z = damp(h.current.rotation.z, clamp(hr[2], -JOINT_LIMIT, JOINT_LIMIT), lambda, dt);
  }
}

export function widenShoulder(u, amount, dt) {
  if (!u.current) return;
  const dir = u.current.position.x > 0 ? 1 : -1;
  const base = dir * (BASE_SHOULDER + SHOULDER_OFFSET);
  u.current.position.x = damp(u.current.position.x, base + dir * amount, 16, dt);
}

export function handOffsetForward(h, dist, dt) {
  if (h.current) h.current.position.z = damp(h.current.position.z, dist, 18, dt);
}

export function updateHand(h, dt) {
  if (!h.current) return;
  const hand = h.current;
  const thumb = hand.children[1];
  const index = hand.children.find((c) => c.userData && c.userData.index);
  const thumbRotTarget = hand.userData.thumbRot || 0;
  const indexExtend = hand.userData.indexExtend || 0;
  if (thumb) thumb.rotation.z = damp(thumb.rotation.z, thumbRotTarget, 18, dt);
  if (index) index.scale.x = damp(index.scale.x || 1, 1 + indexExtend, 18, dt);
  hand.userData.thumbRot = damp(thumbRotTarget, 0, 6, dt);
  hand.userData.indexExtend = damp(indexExtend, 0, 6, dt);
}
