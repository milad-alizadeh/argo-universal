import { describe, expect, it } from 'vitest';
import { diffsLoading } from './changes-items';

const loading = { pages: [], loading: true };

const settled = { pages: [[]] };

describe('diffs loading', () => {
  it('is true while an open file has a page on its way', () => {
    expect(diffsLoading({ '/a': loading }, new Set())).toBe(true);
  });

  it('is false while only a folded file has a page on its way', () => {
    expect(diffsLoading({ '/a': loading }, new Set(['/a']))).toBe(false);
  });

  it('is true while any open file loads, however many are folded', () => {
    const diffs = { '/a': loading, '/b': loading, '/c': settled };

    expect(diffsLoading(diffs, new Set(['/a']))).toBe(true);
  });

  it('is false once every diff has settled', () => {
    expect(diffsLoading({ '/a': settled }, new Set())).toBe(false);
  });
});
