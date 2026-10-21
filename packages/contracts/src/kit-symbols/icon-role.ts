type IconPixels = 6 | 12 | 14 | 16 | 20 | 22 | 24;

// Where an icon sits decides its size. Text is a step larger on the phone, so an icon beside text steps up with it.
export const iconRoles = {
  // Inside a small corner disc on a tile, such as an attachment's Remove.
  badge: { wide: 6, phone: 6 },
  // Beside Body text.
  body: { wide: 16, phone: 20 },
  // Beside Secondary text.
  secondary: { wide: 12, phone: 16 },
  // Inside a control.
  control: { wide: 16, phone: 16 },
  /*
   * Every chevron in the app, wherever it sits: after a label, before a collapsible's title, in a
   * menu trigger. A chevron reads as punctuation beside what it points at, so it is a step under
   * the icons around it and takes one size at every width, rather than a size per surface — the
   * only chevron outside this role is the web `disclosure`, whose artwork is already a 7x12
   * chevron drawn inside a 20 box (owner, 2026-10-20).
   */
  chevron: { wide: 14, phone: 14 },
  // Beside the fixed-size mono text in a file diff.
  code: { wide: 12, phone: 12 },
  // A shape that fills its whole box, one step inside a control's slot.
  mark: { wide: 14, phone: 14 },
  // A list row's leading icon.
  row: { wide: 20, phone: 24 },
  // A web menu or popover row's leading icon: one size in every menu, set by the row (owner, 2026-10-19).
  menu: { wide: 20, phone: 20 },
  // A grouped list row's leading icon, a stock Form's and Material list item's 24 at every width (owner, 2026-10-18).
  'grouped-row': { wide: 24, phone: 24 },
  // A grouped list row's disclosure on the web: its chevron draws iOS's 7x12 in this box at every width.
  disclosure: { wide: 20, phone: 20 },
  // An Agent card's brand mark, aligned with its name.
  identity: { wide: 24, phone: 24 },
  // A header or floating action.
  action: { wide: 20, phone: 20 },
  // Top-level navigation.
  nav: { wide: 24, phone: 24 },
  // A page title's Back.
  title: { wide: 24, phone: 24 },
} as const satisfies Record<string, Record<'wide' | 'phone', IconPixels>>;

export type IconRole = keyof typeof iconRoles;
