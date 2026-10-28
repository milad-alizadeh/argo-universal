import { describe, expect, it } from 'vitest';
import {
  everyPlatform,
  look,
  places,
  widths,
} from '../mocks/list-look-fixtures';
import type { ListPlace } from './list-place';
import { popoverPlace } from './list-place';

const sidebarMenu = 'sidebar-menu';

const sidebarEnd = 'sidebar-end';

const menuPlaces = new Set<ListPlace>([
  'popover',
  'choice',
  sidebarMenu,
  sidebarEnd,
]);

// Only the wide web outside a menu draws the tree.
const treeCases = everyPlatform.flatMap((platform) =>
  places.flatMap((place) =>
    widths.map((wide) => ({
      platform,
      place,
      wide,
      drawn: platform === 'web' && wide && !menuPlaces.has(place),
    })),
  ),
);

const placeFacts = [
  ['page', { menu: false, sidebar: false, sectionEnds: false }],
  ['popover', { menu: true, sidebar: false, sectionEnds: false }],
  ['choice', { menu: true, sidebar: false, sectionEnds: false }],
  ['sidebar', { menu: false, sidebar: true, sectionEnds: false }],
  [sidebarMenu, { menu: true, sidebar: true, sectionEnds: false }],
  [sidebarEnd, { menu: true, sidebar: true, sectionEnds: true }],
] as const;

// A popover opened from the sidebar keeps the sidebar's drawing, as main's separate menu and sidebar contexts did.
const popoverPlaces = [
  ['page', 'popover'],
  ['popover', 'popover'],
  ['choice', 'choice'],
  ['sidebar', sidebarMenu],
  [sidebarMenu, sidebarMenu],
  [sidebarEnd, sidebarEnd],
] as const;

const plain = { appearance: 'plain', wide: true } as const;

describe('the tree', () => {
  it.each(treeCases)(
    'on $platform in $place, wide $wide, is drawn: $drawn',
    ({ drawn, ...where }) => {
      expect(look(where).treeDrawn).toBe(drawn);
    },
  );
});

describe('a popover', () => {
  it.each(popoverPlaces)('opened from %s sits in %s', (opener, place) => {
    expect(popoverPlace(opener)).toBe(place);
  });

  it('opened from the sidebar draws menu rows in the sidebar drawing', () => {
    expect(look({ place: popoverPlace('sidebar') })).toMatchObject({
      menu: true,
      sidebar: true,
    });
  });
});

describe('the place', () => {
  it.each(placeFacts)(
    'tells what %s is to rows and sections',
    (place, facts) => {
      expect(look({ place })).toMatchObject(facts);
    },
  );

  it('gives a choosing popover a heading of its own', () => {
    expect(look({ place: 'choice' }).section.inset).not.toBe(
      look({ place: 'popover' }).section.inset,
    );
  });

  it('starts a compact List heading apart from a regular one on a wide window', () => {
    const compact = look({ ...plain, density: 'compact' });
    const regular = look({ ...plain, density: 'regular' });

    expect(compact.section.inset).not.toBe(regular.section.inset);
  });

  it('keeps a narrow compact List heading as a regular one', () => {
    const narrow = { ...plain, wide: false };

    expect(look({ ...narrow, density: 'compact' }).section).toBe(
      look({ ...narrow, density: 'regular' }).section,
    );
  });
});
