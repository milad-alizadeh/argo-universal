import type { SymbolSource } from './symbol-source';

// What a list shows, how it lays out or groups its rows, and a row's disclosure chevron.
export const listViewSymbols = {
  // A list row's disclosure: forward in the reading direction, as a stock Form row draws it.
  disclosure: { sf: 'chevron.forward', material: 'chevron_right' },
  /*
   * A grouped row's disclosure on the web and desktop, where Material's chevron is too thin and SF's
   * is not shipped: Tabler's chevron has chevron.forward's 7x12 shape and semibold stroke at 20
   * (ADR-0019). iOS and Android draw `disclosure`, so the iOS asset catalog leaves this one out.
   */
  'web-disclosure': { tabler: 'chevron-right' },
  'flat-view': { sf: 'list.bullet', material: 'view_list' },
  'structure-view': { sf: 'square.grid.2x2', material: 'grid_view' },
  'tree-view': { sf: 'list.bullet.indent', material: 'account_tree' },
} as const satisfies Record<string, SymbolSource>;
