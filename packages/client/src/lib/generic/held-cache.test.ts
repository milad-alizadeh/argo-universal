import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHeldCache } from './held-cache';

const graceMs = 1_000;

const maxIdle = 10;

const key = 'session-1';

describe('createHeldCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps a held value after its last holder lets go until the grace period ends', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle });
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
    const cache = createHeldCache<string>({ graceMs, maxIdle });
    const first = cache.hold(key);
    cache.write(key, 'rows');
    first();
    vi.advanceTimersByTime(graceMs / 2);
    cache.hold(key);
    vi.advanceTimersByTime(graceMs * 2);
    expect(cache.read(key)).toBe('rows');
  });

  it('keeps the value while any of several holders still holds it', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle });
    const first = cache.hold(key);
    cache.hold(key);
    cache.write(key, 'rows');
    first();
    vi.advanceTimersByTime(graceMs * 2);
    expect(cache.read(key)).toBe('rows');
  });

  it('drops a value written with no holder once the grace period ends', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle });
    cache.write(key, 'rows');
    vi.advanceTimersByTime(graceMs);
    expect(cache.read(key)).toBeUndefined();
  });

  it('drops the value that let go longest ago once more than the cap sit idle', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle: 2 });

    for (const name of ['a', 'b', 'c']) {
      const release = cache.hold(name);
      cache.write(name, name);
      release();
    }

    expect(['a', 'b', 'c'].map((name) => cache.read(name))).toEqual([
      undefined,
      'b',
      'c',
    ]);
  });

  it('never counts a held value against the idle cap', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle: 1 });
    cache.hold('held');
    cache.write('held', 'rows');

    for (const name of ['a', 'b']) cache.write(name, name);

    expect(['held', 'a', 'b'].map((name) => cache.read(name))).toEqual([
      'rows',
      undefined,
      'b',
    ]);
  });

  it('keeps a value read since it went idle over one left alone', () => {
    const cache = createHeldCache<string>({ graceMs, maxIdle: 2 });
    cache.write('a', 'a');
    cache.write('b', 'b');
    cache.read('a');
    cache.write('c', 'c');

    expect(['a', 'b', 'c'].map((name) => cache.read(name))).toEqual([
      'a',
      undefined,
      'c',
    ]);
  });
});
