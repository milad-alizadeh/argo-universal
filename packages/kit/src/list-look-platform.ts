import type { PlatformOSType } from 'react-native';

export type PhoneDrawing = 'ios' | 'android';

// What a platform draws: the web as itself, iOS and Android as their own, and every other platform as iOS.
export type Drawing = PhoneDrawing | 'web';

const drawings = {
  web: 'web',
  ios: 'ios',
  android: 'android',
  macos: 'ios',
  windows: 'ios',
  native: 'ios',
} satisfies Record<PlatformOSType, Drawing>;

export const drawingOf = (platform: PlatformOSType): Drawing =>
  drawings[platform];

// The glyph a row that pushes a page ends with; Android draws none.
export type DisclosureGlyph = 'disclosure' | 'web-disclosure';

// Where a row's value and description go: iOS keeps the value trailing and the description as the group's footer, Android puts both under the title, the web puts the description there.
export type ValuePlacement =
  | 'trailing'
  | 'under-title'
  | 'description-under-title';

// What marks the row the user is on, so no separator touches its tint: the web's hovered row, iOS's pressed one.
export type RowHighlight = 'hover' | 'press';

export interface PlatformFacts {
  // A section's description shows as its footer; Android puts it on the row.
  footerShown: boolean;
  // The chevron of a row that pushes a page, if the platform draws one.
  chevron?: DisclosureGlyph;
  // A table row that opens its detail shows the chevron; only iOS's drawing does.
  pushChevron: boolean;
  valuePlacement: ValuePlacement;
  // The class a pressed row takes; Android's Pressable draws its ripple instead.
  pressedTint: string;
  rowHighlight?: RowHighlight;
  // The web's wide window can draw the tree: lanes, rails and folding.
  treeCapable: boolean;
}

const pressed = 'active:bg-pressed';

// The one place the platforms' conventions are asked; every part of a List reads the answer from its List look.
const platformFacts = {
  web: {
    footerShown: true,
    chevron: 'web-disclosure',
    pushChevron: false,
    valuePlacement: 'description-under-title',
    pressedTint: pressed,
    rowHighlight: 'hover',
    treeCapable: true,
  },
  ios: {
    footerShown: true,
    chevron: 'disclosure',
    pushChevron: true,
    valuePlacement: 'trailing',
    pressedTint: pressed,
    rowHighlight: 'press',
    treeCapable: false,
  },
  android: {
    footerShown: false,
    chevron: undefined,
    pushChevron: false,
    valuePlacement: 'under-title',
    pressedTint: '',
    rowHighlight: undefined,
    treeCapable: false,
  },
} satisfies Record<Drawing, PlatformFacts>;

export const platformFactsOf = (drawing: Drawing): PlatformFacts =>
  platformFacts[drawing];
