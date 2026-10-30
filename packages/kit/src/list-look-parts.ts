import type { PlatformOSType } from 'react-native';
import type { ListAppearance, ListDensity } from './list-context';
import {
  headingInsetOf,
  insetsOf,
  type Inset,
  type ListInsets,
} from './list-look-insets';
import {
  platformFactsOf,
  type Drawing,
  type PhoneDrawing,
  type PlatformFacts,
} from './list-look-platform';
import type { ListPlace, ListPlaceFacts } from './list-place';

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
  // Where the List sits: a popover's rows are menu rows, a sidebar's are flat tiles.
  place: ListPlace;
  // A wide desktop or web window, where compact rows are one line and the tree is drawn.
  wide: boolean;
  // The look is a List's own; a part outside any List draws a plain look of its own place.
  inList: boolean;
}

export interface PlaceLook {
  place: ListPlace;
  // A part reading this look sits in a List's rows, so a part that would draw its own List draws a section of it.
  inList: boolean;
  // Rows are menu rows of a popover.
  menu: boolean;
  // Rows are tiles on the desktop sidebar's glass.
  sidebar: boolean;
  // Its sections end their container, so none draws space after itself.
  sectionEnds: boolean;
  // A Detail's content column already pads and scrolls this block, so it sizes to its rows and insets nothing.
  padded: boolean;
}

export interface FormLook {
  appearance: ListAppearance;
  // A grouped section is a card the web draws as a cell per row on LegendList.
  webGrouped: boolean;
  // Set when a phone draws the grouped section: corners on its rows, or a native list of FieldGroup rows.
  phone?: PhoneDrawing;
  // A hairline tells rows apart.
  separated: boolean;
  // A row's description closes its group, as an iOS section footer does.
  footerEndsGroup: boolean;
}

export interface RowsLook {
  // Compact rows are one line on a wide desktop or web window (Paper "Issue row"); phones keep regular rows.
  density: ListDensity;
  // This List's rows draw as one line: compact density, on a wide window or in a sidebar, and never as a popover's menu rows.
  compact: boolean;
  // A row that asks for the sidebar's drawing is compact at every width.
  compactSidebarRows: boolean;
}

export interface InsetLook {
  insets: ListInsets;
  // A phone's own side padding, where the caller set one for phones.
  phonePadding?: Inset;
  // How far a Screen heading over these cards moves in so it starts on their rows' text, in px.
  headingInset: number;
}

export interface PlatformLook extends Omit<PlatformFacts, 'treeCapable'> {
  // Only a wide desktop or web window draws the tree: lanes, rails and folding.
  treeDrawn: boolean;
}

export const phoneOf = (drawing: Drawing): PhoneDrawing | undefined =>
  drawing === 'web' ? undefined : drawing;

// A phone draws what the phones declare; the web its own appearance.
export const phoneAppearanceOf = (input: ListLookInput): ListAppearance =>
  input.onPhones?.appearance ?? input.appearance;

export const appearanceOf = (
  drawing: Drawing,
  input: ListLookInput,
): ListAppearance =>
  drawing === 'web' ? input.appearance : phoneAppearanceOf(input);

export function groupedFacts(
  drawing: Drawing,
  appearance: ListAppearance,
): Pick<FormLook, 'webGrouped' | 'phone'> {
  const grouped = appearance === 'grouped';

  return {
    webGrouped: grouped && drawing === 'web',
    phone: grouped ? phoneOf(drawing) : undefined,
  };
}

// Only iOS separates rows and closes a group with a row description.
export const separationFacts = (
  drawing: Drawing,
  appearance: ListAppearance,
): Pick<FormLook, 'separated' | 'footerEndsGroup'> => ({
  separated: drawing === 'ios' && appearance !== 'cards',
  footerEndsGroup: drawing === 'ios',
});

export function formLook(drawing: Drawing, input: ListLookInput): FormLook {
  const appearance = appearanceOf(drawing, input);

  return {
    appearance,
    ...groupedFacts(drawing, appearance),
    ...separationFacts(drawing, appearance),
  };
}

export const densityOf = (
  drawing: Drawing,
  input: ListLookInput,
): ListDensity => (drawing === 'web' ? input.density : 'regular');

const roomyOf = (input: ListLookInput, place: ListPlaceFacts): boolean =>
  input.wide || place.sidebar;

export function rowsLook(
  drawing: Drawing,
  input: ListLookInput,
  place: ListPlaceFacts,
): RowsLook {
  const density = densityOf(drawing, input);
  const oneLine = density === 'compact' && !place.menu;

  return {
    density,
    compact: oneLine && roomyOf(input, place),
    compactSidebarRows: oneLine,
  };
}

export const phonePaddingOf = (
  drawing: Drawing,
  input: ListLookInput,
): Inset | undefined =>
  drawing === 'web' ? undefined : input.onPhones?.padding;

export function insetLook(
  drawing: Drawing,
  input: ListLookInput,
  form: FormLook & Pick<ListPlaceFacts, 'menu' | 'padded'>,
): InsetLook {
  const { menu, padded } = form;
  const phone = form.phone !== undefined;

  return {
    insets: insetsOf({ ...form, menu, padded, phone, fit: input.fit }),
    phonePadding: phonePaddingOf(drawing, input),
    headingInset: headingInsetOf(form.webGrouped, input.wide),
  };
}

export function placeLook(
  { place, inList }: Pick<ListLookInput, 'place' | 'inList'>,
  facts: ListPlaceFacts,
): PlaceLook {
  return {
    place,
    inList,
    menu: facts.menu,
    sidebar: facts.sidebar,
    sectionEnds: facts.ends,
    padded: facts.padded,
  };
}

export function platformLook(
  input: ListLookInput,
  menu: boolean,
): PlatformLook {
  const { treeCapable, ...facts } = platformFactsOf(input.platform);

  return { ...facts, treeDrawn: treeCapable && input.wide && !menu };
}
