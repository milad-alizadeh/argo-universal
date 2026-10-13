// The first free key from the item's own: a repeat gets `#2`, `#3`, skipping any another item already holds.
function freeKey(base: string, used: Set<string>): string {
  let key = base;
  let count = 1;

  while (used.has(key)) {
    count += 1;
    key = `${base}#${count}`;
  }

  used.add(key);

  return key;
}

// Pairs each item with a React key from its content; a repeat is numbered, so keys stay unique without using the position.
export function withOccurrenceKeys<Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
): { item: Item; key: string }[] {
  const used = new Set<string>();

  return items.map((item) => ({ item, key: freeKey(keyOf(item), used) }));
}
