/*
 * Every desktop and web popover and menu, with or without drill-in, draws Paper's Configure popover (owner,
 * 2026-10-20): a card with no edge in light mode, plain rows 4px in from every side,
 * rows 2px apart and a hairline between groups (owner, 2026-11-15). Phone sheets keep their grouped list.
 */
export const menuSurfaceClassName =
  'bg-card rounded-2xl shadow-card dark:border dark:border-border';

// The card's own inset around its rows.
export const menuInsetClassName = 'p-1';

// The same inset where only the wide layout is a popover.
export const wideMenuInsetClassName = 'wide:p-1';

// A row: at least 36 tall, 8 padding, 8 between its parts, the menu-row radius.
export const menuRowClassName =
  'min-h-9 flex-row items-center gap-2 rounded-xl p-2';

// Rows sit 2px apart, so hovered, pressed and checked tiles never touch.
export const menuRowsClassName = 'gap-0.5';

// The line between two groups, inset to the rows' own text edge, with 6px above and below it.
export const menuGroupGapClassName = 'mx-2 my-1 h-px bg-border';

/*
 * How far a web or desktop popover or menu stays from the window's edge when it shifts to fit: the window frame's own
 * inset (`--spacing-frame-inset`, 8), so an overlay clears the edge as the panes do. Radix's collision padding is 0.
 */
export const windowEdgeInset = 8;
