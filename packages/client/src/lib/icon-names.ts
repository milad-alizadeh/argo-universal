import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

// SF names stay within SF Symbols 4, the set iOS 16.4 ships; Material names come from the Material Symbols font expo-symbols bundles.
export interface NativeSymbol {
  sf: SFSymbol;
  sfFilled?: SFSymbol;
  material: AndroidSymbol;
}

export const iconSymbols = {
  add: { sf: 'plus', material: 'add' },
  agent: { sf: 'cpu', material: 'memory' },
  appearance: { sf: 'circle.lefthalf.filled', material: 'contrast' },
  'arrow-down': { sf: 'arrow.down', material: 'arrow_downward' },
  'arrow-right': { sf: 'arrow.right', material: 'arrow_forward' },
  'arrow-up': { sf: 'arrow.up', material: 'arrow_upward' },
  atlas: {
    sf: 'point.3.connected.trianglepath.dotted',
    sfFilled: 'point.3.filled.connected.trianglepath.dotted',
    material: 'share',
  },
  bold: { sf: 'bold', material: 'format_bold' },
  branch: { sf: 'arrow.triangle.branch', material: 'alt_route' },
  check: { sf: 'checkmark', material: 'check' },
  checklist: { sf: 'checklist', material: 'checklist' },
  'chevron-down': { sf: 'chevron.down', material: 'expand_more' },
  'chevron-left': { sf: 'chevron.left', material: 'chevron_left' },
  'chevron-right': { sf: 'chevron.right', material: 'chevron_right' },
  'chevron-up': { sf: 'chevron.up', material: 'expand_less' },
  'chevron-up-down': { sf: 'chevron.up.chevron.down', material: 'unfold_more' },
  close: { sf: 'xmark', material: 'close' },
  code: { sf: 'chevron.left.forwardslash.chevron.right', material: 'code' },
  collapse: {
    sf: 'arrow.down.right.and.arrow.up.left',
    material: 'close_fullscreen',
  },
  compaction: {
    sf: 'arrow.down.and.line.horizontal.and.arrow.up',
    material: 'vertical_align_center',
  },
  computer: { sf: 'desktopcomputer', material: 'desktop_mac' },
  copy: { sf: 'doc.on.doc', material: 'content_copy' },
  delete: { sf: 'trash', material: 'delete' },
  edit: { sf: 'pencil', material: 'edit' },
  error: { sf: 'exclamationmark.circle', material: 'error' },
  expand: {
    sf: 'arrow.up.left.and.arrow.down.right',
    material: 'open_in_full',
  },
  file: { sf: 'doc', material: 'draft' },
  'file-code': { sf: 'curlybraces', material: 'data_object' },
  'file-image': { sf: 'photo', material: 'image' },
  'file-pdf': { sf: 'doc.richtext', material: 'feed' },
  'file-slides': { sf: 'play.rectangle', material: 'slideshow' },
  'file-table': { sf: 'tablecells', material: 'table' },
  'file-text': { sf: 'doc.text', material: 'description' },
  'file-zip': { sf: 'archivebox', material: 'inventory_2' },
  filters: { sf: 'slider.horizontal.3', material: 'tune' },
  folder: { sf: 'folder', material: 'folder' },
  'folder-open': { sf: 'folder.fill', material: 'folder_open' },
  goal: { sf: 'target', material: 'target' },
  info: { sf: 'info.circle', material: 'info' },
  issue: {
    sf: 'ticket',
    sfFilled: 'ticket.fill',
    material: 'confirmation_number',
  },
  italic: { sf: 'italic', material: 'format_italic' },
  key: { sf: 'key', material: 'key_vertical' },
  menu: { sf: 'line.3.horizontal', material: 'menu' },
  merged: { sf: 'arrow.triangle.merge', material: 'merge' },
  more: { sf: 'ellipsis', material: 'more_horiz' },
  'new-session': { sf: 'square.and.pencil', material: 'edit_square' },
  notifications: { sf: 'bell', material: 'notifications' },
  permission: { sf: 'exclamationmark.shield', material: 'gpp_maybe' },
  phone: { sf: 'iphone', material: 'smartphone' },
  'plan-mode': { sf: 'map', material: 'map' },
  plug: { sf: 'powerplug', material: 'power' },
  'pull-request': { sf: 'arrow.triangle.pull', material: 'fork_left' },
  question: { sf: 'questionmark.circle', material: 'help' },
  read: { sf: 'book', material: 'menu_book' },
  retry: { sf: 'arrow.clockwise', material: 'refresh' },
  return: { sf: 'return', material: 'keyboard_return' },
  scheduled: { sf: 'timer', material: 'timer' },
  search: { sf: 'magnifyingglass', material: 'search' },
  server: { sf: 'server.rack', material: 'dns' },
  sessions: {
    sf: 'bubble.left.and.bubble.right',
    sfFilled: 'bubble.left.and.bubble.right.fill',
    material: 'forum',
  },
  settings: {
    sf: 'gearshape',
    sfFilled: 'gearshape.fill',
    material: 'settings',
  },
  sidebar: { sf: 'sidebar.left', material: 'dock_to_left' },
  sparkle: { sf: 'sparkles', material: 'auto_awesome' },
  terminal: { sf: 'terminal', material: 'terminal' },
  thinking: { sf: 'brain', material: 'neurology' },
  tool: { sf: 'wrench.adjustable', material: 'build' },
  underline: { sf: 'underline', material: 'format_underlined' },
  waiting: { sf: 'hourglass', material: 'hourglass' },
  warning: { sf: 'exclamationmark.triangle', material: 'warning' },
  web: { sf: 'globe', material: 'language' },
} as const satisfies Record<string, NativeSymbol>;

export type IconName = keyof typeof iconSymbols;

function isIconName(name: string): name is IconName {
  return Object.hasOwn(iconSymbols, name);
}

export const iconNames: readonly IconName[] =
  Object.keys(iconSymbols).filter(isIconName);
