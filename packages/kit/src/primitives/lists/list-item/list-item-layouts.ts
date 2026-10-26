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
 * Rows keep 16 from their edge and 20 on wide. A sidebar List's row (Paper's SettingsList) is a 52-high tile whose
 * content starts 8 in, on the sidebar title's edge.
 */
export const pressLayouts = {
  row: 'w-full flex-row items-start gap-4 px-4 py-4 wide:px-5',
  menu: 'w-full min-h-9 flex-row items-start gap-2 rounded-xl p-2',
  'sidebar-tile': 'w-full min-h-13 flex-row items-center gap-3.5 px-2 py-1.5',
  ...sidebarPressLayouts,
};

export type PressLayout = keyof typeof pressLayouts;

// Paper: a control wraps onto its own line, 12px under a menu row's title and 8px under a sheet row's.
const controlLine = 'flex-wrap gap-y-2';

export const controlLines = {
  row: controlLine,
  menu: 'flex-wrap gap-y-3',
  'sidebar-tile': controlLine,
  sidebar: controlLine,
  'sidebar-compact': controlLine,
} satisfies Record<PressLayout, string>;
