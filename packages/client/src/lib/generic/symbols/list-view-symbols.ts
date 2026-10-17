import type { SymbolSource } from './symbol-source';

// What a list shows and how it lays out or groups its rows.
export const listViewSymbols = {
  'flat-view': { sf: 'list.bullet', material: 'view_list' },
  'structure-view': { sf: 'square.grid.2x2', material: 'grid_view' },
  'tree-view': { sf: 'list.bullet.indent', material: 'account_tree' },
} as const satisfies Record<string, SymbolSource>;
