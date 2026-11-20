import { describe, expect, it } from 'vitest';
import { covers, type VerifiedStamp } from './verify-stamp.mts';

const stamp: VerifiedStamp = {
  head: 'abc',
  files: { 'tools/a.mts': '1', 'tools/b.mts': '2' },
};

describe('covers', () => {
  it('covers the same files, or fewer, at the same contents and HEAD', () => {
    expect(covers(stamp, stamp)).toBe(true);
    expect(covers(stamp, { head: 'abc', files: { 'tools/b.mts': '2' } })).toBe(
      true,
    );
  });

  it('does not cover a file edited after verify', () => {
    expect(covers(stamp, { head: 'abc', files: { 'tools/a.mts': '9' } })).toBe(
      false,
    );
  });

  it('does not cover a file verify never checked', () => {
    expect(covers(stamp, { head: 'abc', files: { 'tools/c.mts': '3' } })).toBe(
      false,
    );
  });

  it('does not cover a tree on another HEAD', () => {
    expect(covers(stamp, { ...stamp, head: 'def' })).toBe(false);
  });
});
