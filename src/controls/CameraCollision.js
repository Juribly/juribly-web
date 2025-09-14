// CameraCollision.js
// Minimal, allocation-light utilities for keeping cameras from clipping through geometry.
// Mark any mesh collider with either: mesh.userData.collidable = true OR name startsWith("COLLIDER_").

import * as THREE from "three";

const _raycaster = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Collects meshes that should be considered colliders.
 * @param {THREE.Object3D} root
 * @returns {THREE.Mesh[]}
 */
export function gatherColliders(root) {
  const colliders = [];
  root.traverse((o) => {
    if (
      (o.isMesh && (o.userData?.collidable || (typeof o.name === "string" && o.name.startsWith("COLLIDER_")))) ||
      (o.isMesh && o.material && o.material.userData?.collidable)
    ) {
      colliders.push(o);
    }
  });
  return colliders;
}

/**
 * Prevent the *boom* camera from getting occluded/inside walls by pushing it forward to the hit point.
 * Call this for third-person rigs: cast from target -> desiredCamPos.
 * @param {THREE.Vector3} targetPos
 * @param {THREE.Vector3} desiredCamPos (mutated in-place if adjusted)
 * @param {THREE.Mesh[]} colliders
 * @param {number} radius
 */
export function resolveCameraOcclusion(targetPos, desiredCamPos, colliders, radius = 0.25) {
  _dir.copy(desiredCamPos).sub(targetPos);
  const dist = _dir.length();
  if (dist <= 1e-6) return;
  _dir.divideScalar(dist);

  _raycaster.firstHitOnly = true;
  _raycaster.set(targetPos, _dir);
  _raycaster.far = dist + radius;

  const hits = _raycaster.intersectObjects(colliders, false);
  if (hits.length > 0) {
    const hit = hits[0];
    // Move camera slightly in front of the surface to avoid clipping
    desiredCamPos.copy(hit.point);
    if (hit.face?.normal) {
      _tmp.copy(hit.face.normal);
      hit.object.updateMatrixWorld(true);
      _tmp.transformDirection(hit.object.matrixWorld);
      desiredCamPos.addScaledVector(_tmp, radius + 0.02);
    } else {
      // Fallback: pull back along the ray
      desiredCamPos.addScaledVector(_dir, -radius - 0.02);
    }
  }
}

/**
 * Keep a free camera from going under the ground or through colliders.
 * Basic swept-sphere: step from prev->next; if we hit, slide along the surface.
 * @param {THREE.Vector3} prevPos
 * @param {THREE.Vector3} nextPos (mutated in-place to the corrected position)
 * @param {THREE.Mesh[]} colliders
 * @param {number} radius
 * @param {number} steps
 */
export function sweepAndSlide(prevPos, nextPos, colliders, radius = 0.35, steps = 4) {
  const move = _tmp.copy(nextPos).sub(prevPos);
  if (move.lengthSq() === 0) return;

  const step = 1 / steps;
  let cur = new THREE.Vector3().copy(prevPos);
  const n = new THREE.Vector3();

  for (let i = 1; i <= steps; i++) {
    const t = step * i;
    const target = new THREE.Vector3().copy(prevPos).addScaledVector(move, t);

    // Cast from current to target
    const delta = new THREE.Vector3().copy(target).sub(cur);
    const dist = delta.length();
    if (dist < 1e-6) continue;
    delta.divideScalar(dist);

    _raycaster.set(cur, delta);
    _raycaster.far = dist + radius;
    const hits = _raycaster.intersectObjects(colliders, false);

    if (hits.length > 0) {
      const hit = hits[0];
      // Project remaining movement onto the slide plane
      if (hit.face?.normal) {
        n.copy(hit.face.normal);
        hit.object.updateMatrixWorld(true);
        n.transformDirection(hit.object.matrixWorld);
      } else {
        // Fallback: reflect across the ray dir
        n.copy(delta).multiplyScalar(-1);
      }
      // Bring us just outside the surface
      cur.copy(hit.point).addScaledVector(n, radius + 0.02);

      // Slide the rest of the intended movement along the plane
      const remaining = new THREE.Vector3().copy(nextPos).sub(hit.point);
      const slide = remaining.sub(n.multiplyScalar(remaining.dot(n)));
      nextPos.copy(cur.add(slide));
      return;
    } else {
      cur.copy(target);
    }
  }

  // No collisions across steps
  nextPos.copy(cur);
}

/**
 * Clamp camera above ground by raycasting down.
 * @param {THREE.Vector3} pos (mutated)
 * @param {THREE.Mesh[]} colliders
 * @param {number} minClearance
 */
export function keepAboveGround(pos, colliders, minClearance = 0.1) {
  _raycaster.set(pos.clone().addScaledVector(_up, 2), _up.clone().multiplyScalar(-1));
  _raycaster.far = 100;
  const hits = _raycaster.intersectObjects(colliders, false);
  if (hits.length > 0) {
    const groundY = hits[0].point.y;
    if (pos.y < groundY + minClearance) {
      pos.y = groundY + minClearance;
    }
  }
}
