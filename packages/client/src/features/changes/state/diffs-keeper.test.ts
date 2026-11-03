import { describe, expect, it } from 'vitest';
import type { DiffPage, Loaded } from '../source/changes-source';
import { diffsByFile, diffsKeeper, wantedPageKeys } from './diff-pages';

const arrived = (header: string): Loaded<DiffPage> => ({
  data: { hunks: [{ header, lines: [] }], nextCursor: null },
  pending: false,
});

const waiting: Loaded<DiffPage> = { pending: true };

describe('diffs keeper', () => {
  it('hands back the last diffs object while no file changed', () => {
    const keep = diffsKeeper();
    const keys = wantedPageKeys({ '/a': 1, '/b': 1 });
    const a = arrived('@@ a');
    const first = keep(diffsByFile(keys, [a, waiting]));

    expect(keep(diffsByFile(keys, [a, waiting]))).toBe(first);
  });

  it('keeps a file as it was while only another file changed', () => {
    const keep = diffsKeeper();
    const keys = wantedPageKeys({ '/a': 1, '/b': 1 });
    const a = arrived('@@ a');
    const first = keep(diffsByFile(keys, [a, waiting]));
    const second = keep(diffsByFile(keys, [a, arrived('@@ b')]));

    expect(second).not.toBe(first);
    expect(second['/a']).toBe(first['/a']);
  });
});
