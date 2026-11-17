/*
 * Splits the render gates' plan across CI runners. Both gates judge one story file against itself,
 * so a file is the unit a shard owns; no shard needs another's drawings.
 */

export type Shard = { index: number; total: number };

const SHARD = /^(\d+)\/(\d+)$/;

/* Text that is not "<n>/<total>" reads as NaN, which no range contains. */
const read = (text: string): Shard => {
  const [, index, total] = SHARD.exec(text) ?? [];

  return { index: Number(index), total: Number(total) };
};

const inRange = ({ index, total }: Shard): boolean =>
  index >= 1 && index <= total;

/* "2/4" is the second of four; anything else is not a shard. */
export const parseShard = (text: string): Shard | undefined => {
  const shard = read(text);

  return inRange(shard) ? shard : undefined;
};

type Sized<T> = { item: T; position: number; size: number };

const heaviestFirst = <T,>(sized: readonly Sized<T>[]): Sized<T>[] =>
  [...sized].sort((a, b) => b.size - a.size || a.position - b.position);

/* Each item goes to the lightest shard so far; the result maps an item to its 1-based shard. */
const assign = <T,>(
  sized: readonly Sized<T>[],
  total: number,
): Map<T, number> => {
  const loads: number[] = Array.from({ length: total }, (): number => 0);
  const owner = new Map<T, number>();

  for (const { item, size } of heaviestFirst(sized)) {
    const lightest = loads.indexOf(Math.min(...loads));

    loads[lightest] = (loads[lightest] ?? 0) + size;
    owner.set(item, lightest + 1);
  }

  return owner;
};

/*
 * Heaviest first onto the lightest shard, so shards end close together. Ties break by input order,
 * which keeps every runner's split of the same plan identical.
 */
export const shardByWeight = <T,>(
  items: readonly T[],
  weight: (item: T) => number,
  { index, total }: Shard,
): T[] => {
  const owner = assign(
    items.map((item, position) => ({ item, position, size: weight(item) })),
    total,
  );

  return items.filter((item): boolean => owner.get(item) === index);
};
