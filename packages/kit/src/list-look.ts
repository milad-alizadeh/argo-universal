import type { KitSchemaProps } from '@repo/contracts/kit-props';
import type { PlatformOSType } from 'react-native';
import type { ListAppearance } from './list-context';
import { sectionDrawings, type SectionDrawings } from './list-look-section';
import type { SizeClassValue } from './use-size-class/size-class-value';

type Inset = SizeClassValue<NonNullable<KitSchemaProps['Stack']['gap']>>;

// What a List holds around its rows unless its caller sets it.
export interface ListInsets {
  padding?: Inset;
  paddingTop?: Inset;
  paddingBottom?: Inset;
}

export type PhoneDrawing = 'ios' | 'android';

// What the phones draw instead of the web: the Sessions list is flat on the web and cards or grouped on a phone.
export interface PhoneOverrides {
  appearance: ListAppearance;
  // Beats the List's own `padding` on a phone only.
  padding?: Inset;
}

export interface ListLookInput {
  platform: PlatformOSType;
  // The List's own, with the default filled in.
  appearance: ListAppearance;
  // Kit-only: the phones draw the List as grouped cards, and the web keeps `appearance`.
  groupedOnPhones?: boolean;
  onPhones?: PhoneOverrides;
  fit?: boolean;
  // Inside a web popover, whose rows are menu rows.
  menu: boolean;
  // Inside a desktop sidebar, whose rows are flat tiles.
  sidebar: boolean;
}

/*
 * How a List draws, decided once from the platform and the appearance: every part of the List reads this, and none
 * asks Platform.OS about the grouped look itself. The sizes are Tailwind classes and spacing steps, kept here.
 */
export interface ListLook extends SectionDrawings {
  appearance: ListAppearance;
  // A grouped section is a card the web draws as a cell per row on LegendList.
  webGrouped: boolean;
  // Set when a phone draws the grouped section: corners on its rows, or a native list of FieldGroup rows.
  phone?: PhoneDrawing;
  // A hairline tells rows apart.
  separated: boolean;
  // A row's description closes its group, as an iOS section footer does.
  footerEndsGroup: boolean;
  insets: ListInsets;
  // A phone's own side padding, where the caller set one for phones.
  phonePadding?: Inset;
  // Classes a web card's heading and footer add so they start on its rows' text.
  edges: { heading: string; footer: string };
}

// A grouped row's text starts this far inside its card, in px. The web card's heading class, `wide:px-4`, is the same 16.
export const groupedRowInset = 16;

// Cards stand 16 from a compact window's sides; a wide page's column insets them already.
const cardSides = { compact: 4, wide: 0 } as const;

const menuInsets = { padding: 1, paddingTop: 1, paddingBottom: 1 } as const;

// A web grouped list's first heading sits 8 down.
const insetsByAppearance = {
  plain: {},
  cards: { padding: cardSides },
  grouped: { padding: cardSides, paddingTop: 2, paddingBottom: 4 },
} satisfies Record<ListAppearance, ListInsets>;

const phoneInsets = (fit?: boolean): ListInsets => ({
  padding: { compact: 4, wide: fit ? 1 : 0 },
  paddingTop: cardSides,
  paddingBottom: { compact: 8, wide: 6 },
});

const webEdges = { heading: 'wide:px-4 pb-1', footer: 'wide:px-4' };

const noEdges = { heading: '', footer: '' };

const groupedAppearance = (input: ListLookInput): ListAppearance | undefined =>
  input.groupedOnPhones ? 'grouped' : undefined;

const declaredOnPhones = (input: ListLookInput): ListAppearance | undefined =>
  input.onPhones?.appearance ?? groupedAppearance(input);

const phoneAppearance = (input: ListLookInput): ListAppearance | undefined =>
  input.platform === 'web' ? undefined : declaredOnPhones(input);

const lookAppearance = (input: ListLookInput): ListAppearance =>
  phoneAppearance(input) ?? input.appearance;

// Only the web draws a grouped section as a card of its own; every other platform's phones draw corners.
const phoneDrawings = {
  web: undefined,
  ios: 'ios',
  android: 'android',
  macos: 'ios',
  windows: 'ios',
  native: 'ios',
} satisfies Record<PlatformOSType, PhoneDrawing | undefined>;

const phoneGrouped = (
  platform: PlatformOSType,
  appearance: ListAppearance,
): PhoneDrawing | undefined =>
  appearance === 'grouped' ? phoneDrawings[platform] : undefined;

function groupedLook(
  platform: PlatformOSType,
  appearance: ListAppearance,
): Pick<ListLook, 'appearance' | 'phone' | 'webGrouped' | 'edges'> {
  const webGrouped = platform === 'web' && appearance === 'grouped';

  return {
    appearance,
    phone: phoneGrouped(platform, appearance),
    webGrouped,
    edges: webGrouped ? webEdges : noEdges,
  };
}

const rowLook = (
  platform: PlatformOSType,
  appearance: ListAppearance,
): Pick<ListLook, 'separated' | 'footerEndsGroup'> => ({
  separated: platform === 'ios' && appearance !== 'cards',
  footerEndsGroup: platform === 'ios',
});

function insetsOf(
  input: ListLookInput,
  { appearance, phone }: Pick<ListLook, 'appearance' | 'phone'>,
): ListInsets {
  if (input.menu) return menuInsets;

  return phone ? phoneInsets(input.fit) : insetsByAppearance[appearance];
}

export function resolveListLook(input: ListLookInput): ListLook {
  const appearance = lookAppearance(input);
  const grouped = groupedLook(input.platform, appearance);

  return {
    ...grouped,
    ...rowLook(input.platform, appearance),
    insets: insetsOf(input, grouped),
    phonePadding:
      input.platform === 'web' ? undefined : input.onPhones?.padding,
    ...sectionDrawings({ ...input, phone: grouped.phone !== undefined }),
  };
}
