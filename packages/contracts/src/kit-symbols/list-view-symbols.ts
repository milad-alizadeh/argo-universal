// What a list shows, how it lays out or groups its rows, and a row's disclosure chevron.
export const listViewSymbols = {
  // A list row's disclosure: forward in the reading direction, as a stock Form row draws it.
  disclosure: { sf: 'chevron.forward', material: 'chevron_right' },
  /*
   * A grouped row's disclosure on the web and desktop, where Material's chevron is too thin and SF's
   * is not shipped: a small SVG chevron with chevron.forward's shape (ADR-0041). iOS and Android draw `disclosure`.
   */
  'web-disclosure': { svg: 'chevron-right' },
  'flat-view': { sf: 'list.bullet', material: 'view_list' },
  'structure-view': { sf: 'square.grid.2x2', material: 'grid_view' },
  'tree-view': { sf: 'list.bullet.indent', material: 'account_tree' },
  // The Sessions list's View options: One list, the Regular and Compact layouts, and the Archived and All statuses.
  'one-list': { sf: 'list.bullet', material: 'list' },
  'regular-layout': { sf: 'rectangle.grid.1x2', material: 'view_agenda' },
  'compact-layout': { sf: 'line.3.horizontal', material: 'view_headline' },
  archived: { sf: 'archivebox', material: 'archive' },
  'all-sessions': { sf: 'tray.2', material: 'all_inbox' },
} as const;
