// A Workbench card previews this many items; the rest wait behind its footer.
export const previewLimit = 3;

// What a card with live and settled items draws: the live ones as rows, and counts for the rest.
export interface ActivePreview<Item> {
  rows: Item[];
  // Live items past the limit.
  more: number;
  // Settled items, which the footer counts instead of drawing.
  done: number;
}

export function activePreview<Item>(
  items: readonly Item[],
  isActive: (item: Item) => boolean,
): ActivePreview<Item> {
  const active = items.filter(isActive);

  return {
    rows: active.slice(0, previewLimit),
    more: Math.max(0, active.length - previewLimit),
    done: items.length - active.length,
  };
}
