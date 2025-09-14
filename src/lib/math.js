// math.js
// Shared math utilities for damping and clamping.

/**
 * Clamp a value between min and max.
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Exponential damping towards a target value.
 * Returns the interpolated value at time dt with rate lambda.
 * @param {number} from
 * @param {number} to
 * @param {number} lambda
 * @param {number} dt
 */
export function damp(from, to, lambda, dt) {
  return from + (to - from) * (1 - Math.exp(-lambda * dt));
}

