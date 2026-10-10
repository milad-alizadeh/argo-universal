import { readFileSync } from 'node:fs';
import type { Layer, Snapshot } from './snapshot-model.mts';

// Icon layers are named `Icon / <app icon name>`, the names in packages/client/src/lib/icon-names.ts.
export interface IconDrift {
  // Icon layers whose name the app does not have, with how often each appears.
  unknown: { name: string; count: number }[];
  // App icons with no tile on the icon library frame.
  unlisted: string[];
}

const ICON_PREFIX = 'Icon / ';
const LIBRARY = 'Components / Icons';
// A key of a symbol map: `  name: {` or `  'two-words': {`.
const SYMBOL_KEY = /^ {2}'?([\da-z-]+)'?: \{/gm;

export function iconNamesIn(source: string): string[] {
  return [...source.matchAll(SYMBOL_KEY)].flatMap((match): string[] =>
    match[1] === undefined ? [] : [match[1]],
  );
}

export function readAppIconNames(paths: string[]): Set<string> {
  return new Set(
    paths.flatMap((path): string[] => iconNamesIn(readFileSync(path, 'utf8'))),
  );
}

function iconName(layer: Layer): string | undefined {
  return layer.name.startsWith(ICON_PREFIX)
    ? layer.name.slice(ICON_PREFIX.length)
    : undefined;
}

function iconNames(layers: Layer[]): string[] {
  return layers.flatMap((layer): string[] => {
    const name = iconName(layer);
    return name === undefined ? [] : [name];
  });
}

function countUnknown(layers: Layer[], app: Set<string>): IconDrift['unknown'] {
  const counts = new Map<string, number>();
  for (const name of iconNames(layers).filter((n): boolean => !app.has(n)))
    counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]): IconDrift['unknown'][number] => ({
    name,
    count,
  }));
}

function descendants(snapshot: Snapshot, root: Layer): Layer[] {
  return root.children.flatMap((id): Layer[] => {
    const child = snapshot.layers[id];
    return child ? [child, ...descendants(snapshot, child)] : [];
  });
}

function libraryNames(snapshot: Snapshot): Set<string> {
  const library = Object.values(snapshot.layers).find(
    (layer): boolean => layer.name === LIBRARY,
  );
  return new Set(iconNames(library ? descendants(snapshot, library) : []));
}

export function findIconDrift(snapshot: Snapshot, app: Set<string>): IconDrift {
  const listed = libraryNames(snapshot);
  return {
    unknown: countUnknown(Object.values(snapshot.layers), app),
    unlisted: [...app].filter((name): boolean => !listed.has(name)),
  };
}
