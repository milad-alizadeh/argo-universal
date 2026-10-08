import type { Entry } from './document.mts';

export function growthProblems(current: Entry[], baseline: Entry[]): string[] {
  const previous = new Map(
    baseline.map((entry): [string, Entry] => [entry.files[0], entry]),
  );
  return current.flatMap((entry): string[] =>
    entryProblems(entry, previous.get(entry.files[0])),
  );
}

function entryProblems(entry: Entry, previous: Entry | undefined): string[] {
  const glob = entry.files[0];
  if (!previous) return [`${glob}: added entry or changed glob`];
  return Object.keys(entry.rules)
    .filter((rule): boolean => !Object.hasOwn(previous.rules, rule))
    .map((rule): string => `${glob}: added rule ${rule}`);
}
