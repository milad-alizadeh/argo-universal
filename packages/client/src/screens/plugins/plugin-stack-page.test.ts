import { describe, expect, it } from 'vitest';
import { showsBack, stackPageOf } from './plugin-stack-page';

// The live pages of a stack `depth` deep, by how far below the shown page each sits.
const livePages = (depth: number, sectionShown = true): number[] =>
  Array.from({ length: depth }, (_, distance) => distance).filter(
    (distance) => stackPageOf(sectionShown, distance).live,
  );

describe('a section stack’s live views', () => {
  it('is the one page a sidebar tap left', () => {
    expect(livePages(1)).toEqual([0]);
  });

  it('is the shown page and the one Back returns to after pushes', () => {
    expect(livePages(4)).toEqual([0, 1]);
  });

  it('is none while the section is off screen', () => {
    expect(livePages(3, false)).toEqual([]);
  });

  it('shows only the top page', () => {
    expect(stackPageOf(true, 1).shown).toBe(false);
    expect(stackPageOf(true, 0).shown).toBe(true);
  });
});

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
