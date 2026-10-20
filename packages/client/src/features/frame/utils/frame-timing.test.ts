import { describe, expect, it } from 'vitest';
import { frameTiming } from './frame-timing';

describe('frameTiming', () => {
  it('is one motion with a real duration and curve', () => {
    expect(frameTiming.duration).toBeGreaterThan(0);
    expect(frameTiming.curve).toBeDefined();
  });
});
