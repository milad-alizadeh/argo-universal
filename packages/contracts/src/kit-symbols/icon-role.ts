type IconPixels = 12 | 14 | 16 | 20 | 22 | 24;

// Where an icon sits decides its size. Text is a step larger on the phone, so an icon beside text steps up with it.
export const iconRoles = {
  // Beside Body text.
  body: { wide: 16, phone: 20 },
  // Beside Secondary text.
  secondary: { wide: 12, phone: 16 },
  // Inside a control.
  control: { wide: 16, phone: 16 },
  // A disclosure chevron after a label: steps up with the text beside it.
  chevron: { wide: 12, phone: 14 },
  // A shape that fills its whole box, one step inside a control's slot.
  mark: { wide: 14, phone: 14 },
  // A list row's leading icon.
  row: { wide: 20, phone: 24 },
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
