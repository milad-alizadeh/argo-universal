import { describe, expect, it } from 'vitest';
import { parseShard, shardByWeight } from './story-render-shard.mts';

const sizes = new Map([
  ['a', 9],
  ['b', 7],
  ['c', 5],
  ['d', 3],
  ['e', 1],
]);

const items = [...sizes.keys()];

const weigh = (item: string): number => sizes.get(item) ?? 0;

const shardOf = (index: number, total: number): string[] =>
  shardByWeight(items, weigh, { index, total });

const loadOf = (shard: readonly string[]): number =>
  shard.reduce((sum, item) => sum + weigh(item), 0);

describe('parseShard', () => {
  it('reads index and total', () => {
    expect(parseShard('2/4')).toEqual({ index: 2, total: 4 });
  });

  it('rejects text that is not a shard', () => {
    expect(parseShard('0/4')).toBeUndefined();
    expect(parseShard('5/4')).toBeUndefined();
    expect(parseShard('two')).toBeUndefined();
    expect(parseShard('1/2/3')).toBeUndefined();
  });
});

describe('shardByWeight', () => {
  it('gives every item to exactly one shard', () => {
    const all = [1, 2, 3].flatMap((index) => shardOf(index, 3));

    expect(all.sort()).toEqual([...items].sort());
  });

  it('keeps shard loads close by placing heavy items first', () => {
    expect(Math.abs(loadOf(shardOf(1, 2)) - loadOf(shardOf(2, 2)))).toBe(1);
  });

  it('returns the same split on every call', () => {
    expect(shardOf(1, 2)).toEqual(shardOf(1, 2));
  });
});
