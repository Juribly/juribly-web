import { describe, it, expect } from 'vitest';
import { clamp, damp } from './math';

describe('math utilities', () => {
  it('clamp limits values within range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('damp approaches target value', () => {
    const v = damp(0, 10, 5, 0.1);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(10);
  });
});

