import { expect, it } from 'vitest';
import { dropOldest, retainedWarmEntries, type MappedQuery } from './entry-map';

type TestEntry = MappedQuery & { closed: boolean };

function entryWatched(active: boolean): TestEntry {
  const entry: TestEntry = {
    owner: {},
    watchers: { active },
    closed: false,
    close: (): void => {
      entry.closed = true;
    },
  };

  return entry;
}

const watched = (): TestEntry => entryWatched(true);

const warm = (): TestEntry => entryWatched(false);

const many = (count: number, make: () => TestEntry): TestEntry[] =>
  Array.from({ length: count }, make);

function mapOf(entries: TestEntry[]): Map<string, TestEntry> {
  return new Map(entries.map((entry, index) => [String(index), entry]));
}

it('keeps the newest entry when it is the only one nobody is watching', () => {
  const newest = warm();
  const entries = mapOf([...many(retainedWarmEntries, watched), newest]);

  expect(dropOldest(entries)).toBe(0);
  expect(newest.closed).toBe(false);
  expect(entries.has(String(retainedWarmEntries))).toBe(true);
});

it('counts only the entries nobody is watching against the bound', () => {
  const oldest = warm();

  const entries = mapOf([
    oldest,
    ...many(retainedWarmEntries, watched),
    ...many(retainedWarmEntries, warm),
  ]);

  expect(dropOldest(entries)).toBe(1);
  expect(oldest.closed).toBe(true);
  expect(entries.size).toBe(retainedWarmEntries * 2);
});
