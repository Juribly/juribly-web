import { describe, expect, it } from 'vitest';
import { poseArm } from './poseMath.js';

function mockJoint() {
  return { current: { rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 }, children: [] } };
}

describe('poseArm constraints', () => {
  it('clamps elbow and wrist rotations', () => {
    const u = mockJoint();
    const f = mockJoint();
    const h = mockJoint();
    poseArm(u, f, h, { f: [-10, 0, 0], h: [0, 3, 0] }, 1, 1);
    expect(f.current.rotation.x).toBeGreaterThanOrEqual(-2.4);
    expect(f.current.rotation.x).toBeLessThanOrEqual(0.2);
    expect(h.current.rotation.y).toBeLessThanOrEqual(1.5);
  });
});
