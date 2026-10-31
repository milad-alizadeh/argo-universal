import { describe, expect, it } from 'vitest';
import { showsBack } from './plugin-back';

describe('showsBack', () => {
  it('draws no Back on the nav item root, even when the stack can go back', () => {
    expect(showsBack(true, true)).toBe(false);
  });

  it('draws Back on a pushed page when the stack can go back', () => {
    expect(showsBack(false, true)).toBe(true);
  });

  it('draws no Back on a page the stack cannot leave', () => {
    expect(showsBack(false, false)).toBe(false);
  });
});
