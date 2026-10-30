import { createContext, use } from 'react';

/*
 * Where a List and its rows sit, said once by whatever makes the place: a popover, a choosing popover, the desktop
 * sidebar, a popover opened from the sidebar, the last section of a Settings sidebar. List look reads it, so a row, a
 * section or a FieldGroup never combines contexts to find out where it is.
 */
export type ListPlace =
  | 'page'
  | 'detail'
  | 'popover'
  | 'choice'
  | 'sidebar'
  | 'sidebar-menu'
  | 'sidebar-end';

export interface ListPlaceFacts {
  // Rows are a web popover's menu rows (Paper's Combobox master): flat on it, menu-row radius and tints, no card or separators.
  menu: boolean;
  // Rows keep a lane for their check, so a section's heading starts with the rows' text.
  choosing: boolean;
  // Rows are flat tiles on the desktop sidebar's glass.
  sidebar: boolean;
  // Its sections end their container, so none draws space after itself.
  ends: boolean;
  /*
   * A Detail's content column, which pads and scrolls what it holds: a List or a FieldGroup here sizes to its rows,
   * draws no inset of its own and claims no column, so it starts on the body's line.
   */
  padded: boolean;
}

const none = {
  menu: false,
  choosing: false,
  sidebar: false,
  ends: false,
  padded: false,
};

const facts = {
  page: none,
  detail: { ...none, padded: true },
  popover: { ...none, menu: true },
  choice: { ...none, menu: true, choosing: true },
  sidebar: { ...none, sidebar: true },
  'sidebar-menu': { ...none, menu: true, sidebar: true },
  'sidebar-end': { ...none, menu: true, sidebar: true, ends: true },
} satisfies Record<ListPlace, ListPlaceFacts>;

export const listPlaceFacts = (place: ListPlace): ListPlaceFacts =>
  facts[place];

// A popover whose sections choose; anywhere else choosing changes nothing about where a row sits.
export const choosingPlace = (place: ListPlace): ListPlace =>
  place === 'popover' ? 'choice' : place;

// A popover's rows are menu rows, and one opened from the sidebar keeps the sidebar's drawing, as the place it opened from.
const popoverPlaces = {
  page: 'popover',
  detail: 'popover',
  popover: 'popover',
  choice: 'choice',
  sidebar: 'sidebar-menu',
  'sidebar-menu': 'sidebar-menu',
  'sidebar-end': 'sidebar-end',
} satisfies Record<ListPlace, ListPlace>;

export const popoverPlace = (opener: ListPlace): ListPlace =>
  popoverPlaces[opener];

export const ListPlaceContext = createContext<ListPlace>('page');

export const useListPlace = (): ListPlace => use(ListPlaceContext);

// A web popover's rows are menu rows; a phone's popover is a Sheet and keeps the page place.
export const useInMenu = (): boolean => listPlaceFacts(useListPlace()).menu;
