import type { SymbolSource } from './symbol-source';

// What a list shows and how it lays out or groups its rows.
export const listViewSymbols = {
  'active-sessions': { sf: 'tray', material: 'inbox' },
  'all-sessions': { sf: 'tray.2', material: 'all_inbox' },
  'archived-sessions': { sf: 'archivebox', material: 'archive' },
  'flat-view': { sf: 'list.bullet', material: 'view_list' },
  'layout-compact': { sf: 'list.bullet', material: 'view_list' },
  'layout-regular': { sf: 'rectangle.grid.1x2', material: 'view_agenda' },
  'structure-view': { sf: 'square.grid.2x2', material: 'grid_view' },
  'tree-view': { sf: 'list.bullet.indent', material: 'account_tree' },
} as const satisfies Record<string, SymbolSource>;
