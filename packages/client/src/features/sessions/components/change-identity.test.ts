import { describe, expect, it } from 'vitest';
import { changeKey, changeName, findChange } from './change-identity';
import type { SessionPullRequest } from './session-pull-request';

const change = (
  number: number,
  more: Partial<SessionPullRequest> = {},
): SessionPullRequest => ({
  stage: 'open',
  number,
  title: `Change ${number}`,
  mergeable: true,
  ...more,
});

const ours = change(12, {
  id: 'github:owner/repo#12',
  repository: 'owner/repo',
});

const theirs = change(12, {
  id: 'github:fork/repo#12',
  repository: 'fork/repo',
});

describe('Change identity', () => {
  it('tells equal numbers in two repositories apart', () => {
    expect(changeKey(ours)).not.toBe(changeKey(theirs));
    expect(changeName(ours)).toBe('owner/repo#12');
    expect(changeName(theirs)).toBe('fork/repo#12');
  });

  it('falls back to the number where a Change has no supplied identity', () => {
    expect(changeKey(change(7))).toBe('7');
    expect(changeName(change(7))).toBe('#7');
  });

  it('finds the same Change however the list is ordered', () => {
    const key = changeKey(theirs);

    expect(findChange([ours, theirs], key)).toBe(theirs);
    expect(findChange([theirs, ours], key)).toBe(theirs);
  });

  it('finds nothing for a Change that is gone, never a neighbour', () => {
    expect(findChange([ours], changeKey(theirs))).toBeUndefined();
    expect(findChange([ours], null)).toBeUndefined();
  });
});
