// Pairs each item with a React key from its content; a repeat gets `#2`, `#3`, so keys stay unique without using the position.
export function withOccurrenceKeys<Item>(
  items: readonly Item[],
  keyOf: (item: Item) => string,
): { item: Item; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = keyOf(item);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { item, key: count === 1 ? base : `${base}#${count}` };
  });
}
