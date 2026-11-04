import { expect, it } from 'vitest';
import { dropOldest, retainedWarmEntries, type MappedQuery } from './entry-map';

type TestEntry = MappedQuery & { closed: boolean };

function entry(): TestEntry {
  const made: TestEntry = {
    owner: {},
    closed: false,
    close: (): void => {
      made.closed = true;
    },
  };

  return made;
}

const many = (count: number): TestEntry[] =>
  Array.from({ length: count }, entry);

function mapOf(entries: TestEntry[]): Map<string, TestEntry> {
  return new Map(entries.map((made, index) => [String(index), made]));
}

it('keeps every entry inside the bound', () => {
  const entries = mapOf(many(retainedWarmEntries));

  expect(dropOldest(entries)).toBe(0);
  expect(entries.size).toBe(retainedWarmEntries);
});

it('drops and closes the oldest entries over the bound, and keeps the newest', () => {
  const made = many(retainedWarmEntries + 1);
  const entries = mapOf(made);

  expect(dropOldest(entries)).toBe(1);
  expect(made.map(({ closed }) => closed).indexOf(true)).toBe(0);
  expect(made.filter(({ closed }) => closed)).toHaveLength(1);
  expect(entries.has(String(retainedWarmEntries))).toBe(true);
});
