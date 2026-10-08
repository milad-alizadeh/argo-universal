import type { Entry } from './document.mts';

const engineFolders = new Map([
  ['packages/engine/mocks/*', 'apps/server/mocks/*'],
  ['packages/engine/src/engine/*', 'apps/server/src/engine/*'],
  ['packages/engine/src/services/*', 'apps/server/src/services/*'],
  [
    'packages/engine/src/services/agents/*',
    'apps/server/src/services/agents/*',
  ],
  ['packages/engine/src/services/blob/*', 'apps/server/src/services/blob/*'],
  ['packages/engine/src/services/feed/*', 'apps/server/src/services/feed/*'],
  [
    'packages/engine/src/services/projects/*',
    'apps/server/src/services/projects/*',
  ],
  [
    'packages/engine/src/services/sessions/*',
    'apps/server/src/services/sessions/*',
  ],
  [
    'packages/engine/src/services/system/*',
    'apps/server/src/services/system/*',
  ],
]);

const historicalFolder = (glob: string): string =>
  engineFolders.get(glob) ?? glob;

function duplicateIdentities(entries: Entry[]): string[] {
  const seen = new Set<string>();
  return entries.flatMap((entry): string[] => {
    const identity = historicalFolder(entry.files[0]);
    if (seen.has(identity))
      return [`${entry.files[0]}: duplicate historical waiver identity`];
    seen.add(identity);
    return [];
  });
}

export function growthProblems(current: Entry[], baseline: Entry[]): string[] {
  const previous = new Map(
    baseline.map((entry): [string, Entry] => [
      historicalFolder(entry.files[0]),
      entry,
    ]),
  );
  return [
    ...duplicateIdentities(current),
    ...current.flatMap((entry): string[] =>
      entryProblems(entry, previous.get(historicalFolder(entry.files[0]))),
    ),
  ];
}

function entryProblems(entry: Entry, previous: Entry | undefined): string[] {
  const glob = entry.files[0];
  if (!previous) return [`${glob}: added entry or changed glob`];
  return Object.keys(entry.rules)
    .filter((rule): boolean => !Object.hasOwn(previous.rules, rule))
    .map((rule): string => `${glob}: added rule ${rule}`);
}
