import { describe, expect, it } from 'vitest';
import {
  compared,
  initialChangesState,
  markedViewed,
  wantedMore,
} from './changes-state';

const pathA = '/repo/a.ts';

const marked = markedViewed(
  wantedMore(initialChangesState, pathA, 2),
  pathA,
  true,
);

describe('picking a comparison', () => {
  it('starts the Viewed marks and the asked-for pages over for a different one', () => {
    expect(compared(marked, { kind: 'uncommitted' })).toEqual({
      comparison: { kind: 'uncommitted' },
      viewed: [],
      wanted: {},
    });
  });

  it('keeps everything for the comparison already in force', () => {
    expect(compared(marked, { kind: 'main' })).toBe(marked);
  });

  it('tells branches apart by name', () => {
    const release = compared(marked, { kind: 'branch', branch: 'release' });
    const viewed = markedViewed(release, '/repo/b.ts', true);

    expect(compared(viewed, { kind: 'branch', branch: 'release' })).toBe(
      viewed,
    );
    expect(compared(viewed, { kind: 'branch', branch: 'main' }).viewed).toEqual(
      [],
    );
  });
});

describe('marking a file Viewed', () => {
  it('lists each path once and clears it again', () => {
    const twice = markedViewed(marked, pathA, true);

    expect(twice.viewed).toEqual([pathA]);
    expect(markedViewed(twice, pathA, false).viewed).toEqual([]);
  });
});

describe('asking for diff pages', () => {
  it('raises a file to the pages asked for', () => {
    expect(wantedMore(marked, pathA, 3).wanted).toEqual({
      [pathA]: 3,
    });
  });

  it('keeps the state when asked for as many pages or fewer', () => {
    expect(wantedMore(marked, pathA, 2)).toBe(marked);
    expect(wantedMore(marked, pathA, 1)).toBe(marked);
  });
});
