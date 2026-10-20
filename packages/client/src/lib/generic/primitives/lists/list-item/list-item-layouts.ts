import type { ListItemProps } from './list-item-props';

/*
 * Paper "SessionsList": a sidebar row sits 10 by 12 inside its tint, its lanes 10 apart; a Compact one is a 36-tall
 * line.
 */
const sidebarPressLayouts = {
  sidebar: 'w-full flex-row items-start gap-2.5 px-3 py-2.5',
  'sidebar-compact': 'w-full flex-row items-center gap-2.5 px-3 py-2',
};

export const sidebarLayouts = {
  regular: 'sidebar',
  compact: 'sidebar-compact',
} as const satisfies Record<
  NonNullable<ListItemProps['sidebar']>,
  keyof typeof pressLayouts
>;

/*
 * A desktop or web grouped card holds its rows 16 from its edge (Paper "Settings · Porcelain"); other rows keep 20 on
 * wide, as a page's content card (Paper's List / Grouped) does. A sidebar List's row (Paper's SettingsList) is a
 * 48-high tile.
 *
 * A card's rows spend 4 of that 16 on a transparent border they clip their background to, so a row's tint is a
 * rounded tile inside the card rather than a band across it, as a popover's rows are. The content doesn't move.
 */
const cardTile = 'border-4 border-transparent bg-clip-padding rounded-xl';

export const pressLayouts = {
  row: 'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5',
  card: `w-full flex-row items-start gap-4 px-3 py-3 ${cardTile}`,
  content: `w-full flex-row items-start gap-4 px-4 py-3 ${cardTile}`,
  menu: 'w-full min-h-9 flex-row items-start gap-2 rounded-xl p-2',
  'sidebar-tile': 'w-full min-h-12 flex-row items-center gap-3 px-4 py-1.5',
  ...sidebarPressLayouts,
};

export type PressLayout = keyof typeof pressLayouts;

// Paper: a control wraps onto its own line, 12px under a menu row's title and 8px under a sheet row's.
const controlLine = 'flex-wrap gap-y-2';

export const controlLines = {
  row: controlLine,
  card: controlLine,
  content: controlLine,
  menu: 'flex-wrap gap-y-3',
  'sidebar-tile': controlLine,
  sidebar: controlLine,
  'sidebar-compact': controlLine,
} satisfies Record<PressLayout, string>;
