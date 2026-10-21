/*
 * The tray a table and a code block share: a tinted plate whose top 32px shows through beside the
 * content as the header strip, with the content card inset 4px inside it. One recipe, so a code
 * block and a table read as the same kind of object wherever they sit in a Feed row.
 */
export const trayClassName = 'rounded-2xl bg-tint px-1 pb-1';

// The card the tray holds: a table's rows, a code block's lines. It clips them to its own corners.
export const trayCardClassName = 'overflow-hidden rounded-xl bg-card';

// What a fade over the card's edge fades into, so a scrolled line disappears into the card, not the page.
export const trayCardSurface = 'bg-card';
