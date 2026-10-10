import type { Entry } from './document.mts';
import { relocatedFolders } from './relocations.mts';

const historicalFolders = (glob: string): string[] =>
  relocatedFolders.get(glob) ?? [glob];

// Identity -> whether an unmoved folder claims it. Folders split from one historical folder may share it; an unmoved folder may not sit beside its own move.
type Claims = Map<string, boolean>;

function clashes(
  claims: Claims,
  identities: string[],
  original: boolean,
): boolean {
  return identities.some(
    (identity): boolean =>
      claims.has(identity) && (original || claims.get(identity) === true),
  );
}

function claim(claims: Claims, identities: string[], original: boolean): void {
  for (const identity of identities)
    claims.set(identity, original || claims.get(identity) === true);
}

function duplicateIdentities(entries: Entry[]): string[] {
  const claims: Claims = new Map();
  return entries.flatMap((entry): string[] => {
    const glob = entry.files[0];
    const original = !relocatedFolders.has(glob);
    const identities = historicalFolders(glob);
    const clash = clashes(claims, identities, original);
    claim(claims, identities, original);
    return clash ? [`${glob}: duplicate historical waiver identity`] : [];
  });
}

// A folder's baseline is its own entry plus the entries of the folders it was moved from.
function baselineSources(glob: string, baseline: Entry[]): Entry[] {
  const folders = new Set([glob, ...historicalFolders(glob)]);
  return baseline.filter((entry): boolean => folders.has(entry.files[0]));
}

export function growthProblems(current: Entry[], baseline: Entry[]): string[] {
  return [
    ...duplicateIdentities(current),
    ...current.flatMap((entry): string[] =>
      entryProblems(entry, baselineSources(entry.files[0], baseline)),
    ),
  ];
}

function entryProblems(entry: Entry, sources: Entry[]): string[] {
  const glob = entry.files[0];
  if (sources.length === 0) return [`${glob}: added entry or changed glob`];
  return Object.keys(entry.rules)
    .filter(
      (rule): boolean =>
        !sources.some((source): boolean => Object.hasOwn(source.rules, rule)),
    )
    .map((rule): string => `${glob}: added rule ${rule}`);
}
