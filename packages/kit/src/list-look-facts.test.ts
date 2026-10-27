import { describe, expect, it } from 'vitest';
import {
  everyPlatform,
  look,
  places,
  widths,
} from '../mocks/list-look-fixtures';
import type { DisclosureGlyph, ValuePlacement } from './list-look';

type Platform = (typeof everyPlatform)[number];

const chevrons = {
  web: 'web-disclosure',
  ios: 'disclosure',
  android: undefined,
  macos: 'disclosure',
} satisfies Record<Platform, DisclosureGlyph | undefined>;

const placements = {
  web: 'description-under-title',
  ios: 'trailing',
  android: 'under-title',
  macos: 'trailing',
} satisfies Record<Platform, ValuePlacement>;

// Whether the platform draws a footer, a pressed tint and a pushing chevron.
const interactions = {
  web: { footer: true, tint: true, push: false },
  ios: { footer: true, tint: true, push: true },
  android: { footer: false, tint: false, push: false },
  macos: { footer: true, tint: true, push: true },
} satisfies Record<Platform, { footer: boolean; tint: boolean; push: boolean }>;

const highlights = {
  web: 'hover',
  ios: 'press',
  android: undefined,
  macos: 'press',
} as const;

const everywhere = everyPlatform.flatMap((platform) =>
  places.flatMap((place) => widths.map((wide) => ({ platform, place, wide }))),
);

// Only the wide web outside a menu draws the tree.
const treeCases = everywhere.map((where) => ({
  ...where,
  drawn:
    where.platform === 'web' &&
    where.wide &&
    !['popover', 'choice', 'sidebar-end'].includes(where.place),
}));

const placeFacts = [
  ['page', { menu: false, sidebar: false, sectionEnds: false }],
  ['popover', { menu: true, sidebar: false, sectionEnds: false }],
  ['choice', { menu: true, sidebar: false, sectionEnds: false }],
  ['sidebar', { menu: false, sidebar: true, sectionEnds: false }],
  ['sidebar-end', { menu: true, sidebar: true, sectionEnds: true }],
] as const;

const plain = { appearance: 'plain', wide: true } as const;

describe('what a platform draws, whatever the place and the width', () => {
  it.each(everywhere)(
    'answers every fact for $platform, $place, wide: $wide',
    (where) => {
      const resolved = look(where);
      const expected = interactions[where.platform];

      expect(resolved.chevron).toBe(chevrons[where.platform]);
      expect(resolved.valuePlacement).toBe(placements[where.platform]);
      expect(resolved.footerShown).toBe(expected.footer);
      expect(Boolean(resolved.pressedTint)).toBe(expected.tint);
      expect(resolved.pushChevron).toBe(expected.push);
      expect(resolved.rowHighlight).toBe(highlights[where.platform]);
    },
  );

  it('gives macOS the one answer iOS gives, never the web chevron', () => {
    expect(look({ platform: 'macos' }).chevron).toBe(
      look({ platform: 'ios' }).chevron,
    );
  });
});

describe('the tree', () => {
  it.each(treeCases)(
    'on $platform in $place, wide $wide, is drawn: $drawn',
    ({ drawn, ...where }) => {
      expect(look(where).treeDrawn).toBe(drawn);
    },
  );
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
