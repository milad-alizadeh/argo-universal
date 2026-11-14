import { describe, expect, it } from 'vitest';
import { discoveryOf, unreadOf } from './change-outcomes';

const none = { count: 0, branch: '', signIn: false };

describe('discoveryOf', () => {
  it("keeps each of discovery's five answers apart", () => {
    expect(discoveryOf({ result: 'found', pullRequests: [{}, {}] })).toEqual({
      ...none,
      result: 'found',
      count: 2,
    });
    expect(discoveryOf({ result: 'no-match', branch: 'b' })).toEqual({
      ...none,
      result: 'no-match',
      branch: 'b',
    });
    expect(discoveryOf({ result: 'branchless' }).result).toBe('branchless');
    expect(discoveryOf({ result: 'not-github' }).result).toBe('not-github');
    expect(
      discoveryOf({ result: 'unavailable', signIn: true, message: 'x' }),
    ).toEqual({ ...none, result: 'unavailable', signIn: true });
  });

  it('reads an answer it does not know as unavailable, never as no match', () => {
    expect(discoveryOf(null).result).toBe('unavailable');
    expect(discoveryOf({ result: 'new' }).result).toBe('unavailable');
  });
});

describe('unreadOf', () => {
  it('keeps only the pull requests that came back with an error', () => {
    expect(
      unreadOf({
        changes: [
          { id: 'github:o/a#1', title: 'read' },
          { repository: 'o/a', number: 2, error: 'down' },
        ],
      }),
    ).toEqual([{ repository: 'o/a', number: 2, error: 'down' }]);
  });

  it('finds an empty answer to hold none, and an answer of another shape to say nothing', () => {
    expect(unreadOf({ changes: [] })).toEqual([]);
    expect(unreadOf(null)).toBeUndefined();
  });
});
