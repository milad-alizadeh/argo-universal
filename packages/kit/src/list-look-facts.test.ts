import { describe, expect, it } from 'vitest';
import {
  everyPlatform,
  look,
  places,
  widths,
} from '../mocks/list-look-fixtures';
import type {
  DisclosureGlyph,
  RowHighlight,
  SelectionBar,
  SelectionMark,
  ValuePlacement,
} from './list-look';

type Platform = (typeof everyPlatform)[number];

// What each platform drew before List look took the questions over; only macOS changes, to SF's chevron.
const webChevron = 'web-disclosure';

const chevrons = {
  web: webChevron,
  ios: 'disclosure',
  android: undefined,
  macos: 'disclosure',
  windows: webChevron,
  native: webChevron,
} satisfies Record<Platform, DisclosureGlyph | undefined>;

const trailing = 'trailing';

const placements = {
  web: 'description-under-title',
  ios: trailing,
  android: 'under-title',
  macos: trailing,
  windows: trailing,
  native: trailing,
} satisfies Record<Platform, ValuePlacement>;

interface Drawn {
  footer: boolean;
  // A pressed ListItem's tint.
  tint: boolean;
  // A pressed Table grid row's or VirtualListItem's tint.
  drawnTint: boolean;
  push: boolean;
}

const otherNative = {
  footer: true,
  tint: false,
  drawnTint: true,
  push: false,
} satisfies Drawn;

const interactions = {
  web: { footer: true, tint: true, drawnTint: true, push: false },
  ios: { footer: true, tint: true, drawnTint: true, push: true },
  android: { footer: false, tint: false, drawnTint: false, push: false },
  macos: otherNative,
  windows: otherNative,
  native: otherNative,
} satisfies Record<Platform, Drawn>;

const highlights = {
  web: 'hover',
  ios: 'press',
  android: undefined,
  macos: undefined,
  windows: undefined,
  native: undefined,
} satisfies Record<Platform, RowHighlight | undefined>;

interface Selecting {
  selectionBar: SelectionBar;
  selectionMark?: SelectionMark;
  pointerSelection: boolean;
  longPressSelects: boolean;
  selectingDropsRowActions: boolean;
  primarySelectionStands: boolean;
  domRows: boolean;
  edgeFades: boolean;
  footerIcon: boolean;
}

const contextual = {
  selectionBar: 'contextual',
  selectionMark: undefined,
  pointerSelection: false,
  longPressSelects: false,
  selectingDropsRowActions: false,
  primarySelectionStands: false,
  domRows: false,
  edgeFades: true,
  footerIcon: false,
} satisfies Selecting;

const selecting = {
  web: {
    ...contextual,
    selectionBar: 'selected-rows',
    pointerSelection: true,
    primarySelectionStands: true,
    domRows: true,
  },
  ios: {
    ...contextual,
    selectionBar: 'edit-mode',
    selectionMark: 'leading',
    edgeFades: false,
  },
  android: {
    ...contextual,
    selectionMark: 'trailing',
    longPressSelects: true,
    selectingDropsRowActions: true,
    footerIcon: true,
  },
  macos: contextual,
  windows: contextual,
  native: contextual,
} satisfies Record<Platform, Selecting>;

const everywhere = everyPlatform.flatMap((platform) =>
  places.flatMap((place) => widths.map((wide) => ({ platform, place, wide }))),
);

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
      expect(resolved.ripple).toBe(!expected.drawnTint);
      expect(resolved.pushChevron).toBe(expected.push);
      expect(resolved.rowHighlight).toBe(highlights[where.platform]);
      expect(resolved).toMatchObject(selecting[where.platform]);
    },
  );

  it('gives macOS the one answer iOS gives, never the web chevron', () => {
    expect(look({ platform: 'macos' }).chevron).toBe(
      look({ platform: 'ios' }).chevron,
    );
  });
});
