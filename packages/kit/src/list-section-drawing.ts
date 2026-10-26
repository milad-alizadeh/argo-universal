import { use } from 'react';
import { ListContext } from './list-context';
import { isNativeGrouped } from './list-grouped';
import { useInChoiceMenu, useInMenu } from './menu-rows-context';
import { useRowDrawing } from './row-drawing-context';

export interface SectionDrawing {
  // The header label's colour, for its text and leading icon.
  heading: string;
  // The footer's colour, unless it reports a failure.
  footer: string;
  // The header's and footer's inset from the List's edge.
  inset: string;
  // The gap below the header, which belongs to its label so a toggle's press area runs down to the rows.
  gap: string;
  // The space after the section, before the next one.
  below: string;
  // A title colour set after the heading role, which otherwise draws its own over the heading colour above.
  title?: string;
}

const muted = 'text-muted-foreground';

// Inset as the rows' content.
const rowInset = { inset: 'px-4 wide:px-5', gap: 'pb-2', below: 'h-4' };

// Paper's SettingsList: a sidebar's groups head their flat rows with a muted heading, inset as the rows' content.
const sidebar = {
  heading: muted,
  title: muted,
  footer: muted,
  inset: 'px-2',
  gap: 'pb-2',
  below: 'h-4',
} satisfies SectionDrawing;

const phoneMuted = 'text-tone-neutral-600';

// A phone's grouped List draws its headers and footers on the grouped grey in neutral-600, the shade that keeps AA there.
const phoneGrouped = {
  heading: phoneMuted,
  title: phoneMuted,
  footer: phoneMuted,
  ...rowInset,
} satisfies SectionDrawing;

const plain = {
  heading: muted,
  footer: muted,
  ...rowInset,
} satisfies SectionDrawing;

// A popover's section heading starts where its rows' icons do: the row's 8 padding in from the card's inset.
const menu = { ...plain, inset: 'px-2' } satisfies SectionDrawing;

// A choosing popover's rows keep a lane for the check (16) and a gap (8) before the text, and its heading starts with that text.
const choosingMenu = { ...menu, inset: 'pl-8 pr-2' } satisfies SectionDrawing;

const menuDrawing = (choosing: boolean): SectionDrawing =>
  choosing ? choosingMenu : menu;

const listDrawing = (
  inMenu: boolean,
  choosing: boolean,
  phone: boolean,
): SectionDrawing => {
  if (inMenu) return menuDrawing(choosing);

  return phone ? phoneGrouped : plain;
};

export function useSectionDrawing(): SectionDrawing {
  const inMenu = useInMenu();
  const choosing = useInChoiceMenu();
  const phone = isNativeGrouped(use(ListContext).appearance);

  if (useRowDrawing() === 'sidebar') return sidebar;

  return listDrawing(inMenu, choosing, phone);
}
