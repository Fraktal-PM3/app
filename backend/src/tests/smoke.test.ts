import { describe, it, expect } from 'vitest';

describe('backend vitest smoke', () => {
  it('vitest runs and basic assertions work', () => {
    expect(1 + 1).toBe(2);
  });

  it('process.env is accessible in tests', () => {
    expect(typeof process.env).toBe('object');
  });
});