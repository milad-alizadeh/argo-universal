// The item's own text, then `#2`, `#3` for each further time that same text comes round.
const numbered = (base: string, seen: number): string =>
  seen === 0 ? base : `${base}#${seen + 1}`;

/*
 * The first free key from the item's own, skipping any another item already holds. Each base
 * resumes counting where it left off, so a list holding the same text a thousand times over — a
 * fence's syntax spans, say — stays linear rather than squaring.
 */
function freeKey(
  base: string,
  counts: Map<string, number>,
  used: Set<string>,
): string {
  let seen = counts.get(base) ?? 0;

  while (used.has(numbered(base, seen))) seen += 1;

  const key = numbered(base, seen);

  counts.set(base, seen + 1);
  used.add(key);

  return key;
}

// Pairs each item with a React key from its content; a repeat is numbered, so keys stay unique without using the position.
export function withOccurrenceKeys<Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
): { item: Item; key: string }[] {
  const counts = new Map<string, number>();
  const used = new Set<string>();

  return items.map((item) => ({
    item,
    key: freeKey(keyOf(item), counts, used),
  }));
}
