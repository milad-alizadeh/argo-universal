// A Workbench card previews this many items; the rest wait behind its "Show more".
export const previewLimit = 3;

export const previewOf = <Item>(items: readonly Item[]): Item[] =>
  items.slice(0, previewLimit);

export const hiddenCount = (items: readonly unknown[]): number =>
  Math.max(0, items.length - previewLimit);
