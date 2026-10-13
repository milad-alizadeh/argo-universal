import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHeldCache } from './held-cache';

const graceMs = 1_000;

const key = 'session-1';

describe('createHeldCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a held value after its last holder lets go until the grace period ends', () => {
    const cache = createHeldCache<string>(graceMs);
    const release = cache.hold(key);
    cache.write(key, 'rows');
    release();
    vi.advanceTimersByTime(graceMs - 1);
    const during = cache.read(key);
    vi.advanceTimersByTime(1);
    expect({ during, after: cache.read(key) }).toEqual({
      during: 'rows',
      after: undefined,
    });
  });

  it('keeps the value for a holder that takes it within the grace period', () => {
    const cache = createHeldCache<string>(graceMs);
    const first = cache.hold(key);
    cache.write(key, 'rows');
    first();
    vi.advanceTimersByTime(graceMs / 2);
    cache.hold(key);
    vi.advanceTimersByTime(graceMs * 2);
    expect(cache.read(key)).toBe('rows');
  });

  it('keeps the value while any of several holders still holds it', () => {
    const cache = createHeldCache<string>(graceMs);
    const first = cache.hold(key);
    cache.hold(key);
    cache.write(key, 'rows');
    first();
    vi.advanceTimersByTime(graceMs * 2);
    expect(cache.read(key)).toBe('rows');
  });

  it('drops a value written with no holder once the grace period ends', () => {
    const cache = createHeldCache<string>(graceMs);
    cache.write(key, 'rows');
    vi.advanceTimersByTime(graceMs);
    expect(cache.read(key)).toBeUndefined();
  });
});
