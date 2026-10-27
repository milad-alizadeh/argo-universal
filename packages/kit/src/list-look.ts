import type { KitSchemaProps } from '@repo/contracts/kit-props';
import type { PlatformOSType } from 'react-native';
import type { ListAppearance, ListDensity } from './list-context';
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

// A List of ListItems the phones draw as grouped cards (owner, 2026-10-24) while the web keeps its own appearance.
export const phonesGrouped: PhoneOverrides = { appearance: 'grouped' };

export interface ListLookInput {
  platform: PlatformOSType;
  // The List's own, with the default filled in.
  appearance: ListAppearance;
  // The List's own, with the default filled in; a phone draws regular rows whatever it declares.
  density: ListDensity;
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
  // Compact rows are one line on a wide desktop or web window (Paper "Issue row"); phones keep regular rows.
  density: ListDensity;
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
export const cardSides = { compact: 4, wide: 0 } as const;

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

// What each platform draws a grouped section as: only the web draws it as a card of its own, the rest as corners.
const phoneDrawings = {
  web: undefined,
  ios: 'ios',
  android: 'android',
  macos: 'ios',
  windows: 'ios',
  native: 'ios',
} satisfies Record<PlatformOSType, PhoneDrawing | undefined>;

type Drawing = PhoneDrawing | undefined;

const phoneAppearance = ({
  onPhones,
  appearance,
}: ListLookInput): ListAppearance => onPhones?.appearance ?? appearance;

const lookAppearance = (
  drawing: Drawing,
  input: ListLookInput,
): ListAppearance => (drawing ? phoneAppearance(input) : input.appearance);

const phoneGrouped = (drawing: Drawing, appearance: ListAppearance): Drawing =>
  appearance === 'grouped' ? drawing : undefined;

function groupedLook(
  drawing: Drawing,
  appearance: ListAppearance,
): Pick<ListLook, 'appearance' | 'phone' | 'webGrouped' | 'edges'> {
  const webGrouped = drawing === undefined && appearance === 'grouped';

  return {
    appearance,
    phone: phoneGrouped(drawing, appearance),
    webGrouped,
    edges: webGrouped ? webEdges : noEdges,
  };
}

// Only iOS separates rows and closes a group with a row description.
const rowLook = (
  drawing: Drawing,
  appearance: ListAppearance,
): Pick<ListLook, 'separated' | 'footerEndsGroup'> => ({
  separated: drawing === 'ios' && appearance !== 'cards',
  footerEndsGroup: drawing === 'ios',
});

function insetsOf(
  input: ListLookInput,
  { appearance, phone }: Pick<ListLook, 'appearance' | 'phone'>,
): ListInsets {
  if (input.menu) return menuInsets;

  return phone ? phoneInsets(input.fit) : insetsByAppearance[appearance];
}

const phonePaddingOf = (
  drawing: Drawing,
  { onPhones }: ListLookInput,
): Inset | undefined => (drawing ? onPhones?.padding : undefined);

export function resolveListLook(input: ListLookInput): ListLook {
  const drawing = phoneDrawings[input.platform];
  const appearance = lookAppearance(drawing, input);
  const grouped = groupedLook(drawing, appearance);

  return {
    ...grouped,
    density: drawing ? 'regular' : input.density,
    ...rowLook(drawing, appearance),
    insets: insetsOf(input, grouped),
    phonePadding: phonePaddingOf(drawing, input),
    ...sectionDrawings({ ...input, phone: grouped.phone !== undefined }),
  };
}

export interface CompactPlace {
  menu: boolean;
  wide: boolean;
  // A sidebar row, by its own option or its List's drawing.
  sidebar: boolean;
}

const oneLine = ({ wide, sidebar }: CompactPlace): boolean => wide || sidebar;

// A compact List's rows draw as one line on a wide window, and a sidebar's at every web width; never as a popover's menu rows.
export const rowsAreCompact = (
  density: ListDensity,
  place: CompactPlace,
): boolean => density === 'compact' && !place.menu && oneLine(place);
