import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { sweepAndSlide, keepAboveGround } from './CameraCollision';

describe('camera collision', () => {
  it('keeps position above floor', () => {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial()
    );
    floor.rotateX(-Math.PI / 2);
    floor.userData.collidable = true;
    const colliders = [floor];

    const prev = new THREE.Vector3(0, 1, 0);
    const next = new THREE.Vector3(0, -1, 0);
    sweepAndSlide(prev, next, colliders, 0.35, 2);
    keepAboveGround(next, colliders, 0);

    expect(next.y).toBeGreaterThanOrEqual(0);
  });
});

