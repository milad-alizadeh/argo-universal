import { createHash } from 'node:crypto';
import type { Layer, Snapshot, Styles } from './snapshot-model.mts';

/*
 * Reading computed styles is the slow part of a snapshot, so styles are reused per unit: a subtree
 * whose JSX and layers have not changed since the last snapshot keeps the styles read then.
 */
export interface StyleUnit {
  root: string;
  layers: string[];
}

/*
 * The root of every unit is read on each run, with the artboards and the containers too big to be one
 * unit: get_jsx leaves out a root's own position, and these few layers are cheap to read.
 */
export interface StyleSplit {
  units: StyleUnit[];
  alwaysRead: string[];
}

// Small enough that editing one card re-reads only a few hundred layers, large enough to keep get_jsx calls few.
const UNIT_LIMIT = 500;

type Layers = Record<string, Layer>;

function childrenOf(layers: Layers, id: string): string[] {
  return layers[id]?.children ?? [];
}

function subtreeOf(layers: Layers, id: string): string[] {
  return [
    id,
    ...childrenOf(layers, id).flatMap((child): string[] =>
      subtreeOf(layers, child),
    ),
  ];
}

function splitChildren(layers: Layers, split: StyleSplit, id: string): void {
  split.alwaysRead.push(id);
  for (const child of childrenOf(layers, id)) splitAt(layers, split, child);
}

function splitAt(layers: Layers, split: StyleSplit, id: string): void {
  const subtree = subtreeOf(layers, id);
  if (subtree.length > UNIT_LIMIT) return splitChildren(layers, split, id);
  split.alwaysRead.push(id);
  if (subtree.length > 1) split.units.push({ root: id, layers: subtree });
}

export function splitStyleUnits(layers: Layers): StyleSplit {
  const split: StyleSplit = { units: [], alwaysRead: [] };
  const artboards = Object.values(layers).filter(
    (layer): boolean => layer.parent === null,
  );
  for (const artboard of artboards) splitChildren(layers, split, artboard.id);
  return split;
}

// get_jsx has no layer ids or names, so the unit's layers from the tree walk are hashed with it.
export function unitFingerprint(jsx: string, layers: Layer[]): string {
  return createHash('sha256')
    .update(jsx)
    .update(JSON.stringify(layers))
    .digest('hex');
}

type Current = Pick<Snapshot, 'fileId' | 'tokens'>;

function sameTokens(
  before: Record<string, string>,
  after: Record<string, string>,
): boolean {
  const names = Object.keys(after);
  return (
    names.length === Object.keys(before).length &&
    names.every((name): boolean => before[name] === after[name])
  );
}

const refusals: {
  reason: string;
  applies: (previous: Snapshot, current: Current) => boolean;
}[] = [
  {
    reason: 'the earlier snapshot is of another file',
    applies: (previous, current): boolean => previous.fileId !== current.fileId,
  },
  {
    reason: 'the earlier snapshot has no fingerprints',
    applies: (previous): boolean => previous.fingerprints === undefined,
  },
  {
    reason: 'the tokens changed since the earlier snapshot',
    applies: (previous, current): boolean =>
      !sameTokens(previous.tokens, current.tokens),
  },
];

// Why no styles of the previous snapshot can be reused, or undefined when they can.
export function reuseRefusal(
  previous: Snapshot | undefined,
  current: Current,
): string | undefined {
  if (!previous) return 'no earlier snapshot to reuse';
  return refusals.find((refusal): boolean => refusal.applies(previous, current))
    ?.reason;
}

export interface StylePlan {
  reused: Record<string, Styles>;
  read: string[];
  reusedUnits: number;
  rereadUnits: number;
}

type Reusable = Pick<Snapshot, 'styles' | 'fingerprints'>;

export interface StylePlanInput {
  split: StyleSplit;
  fingerprints: Record<string, string>;
  previous: Reusable | undefined;
}

const nothingToReuse: Reusable = { styles: {}, fingerprints: {} };

function isReusable(
  previous: Reusable,
  fingerprints: Record<string, string>,
  unit: StyleUnit,
): boolean {
  return (
    previous.fingerprints?.[unit.root] === fingerprints[unit.root] &&
    unit.layers.every((id): boolean => previous.styles[id] !== undefined)
  );
}

// The unit's layers below its root, which is always read.
function belowRoot(unit: StyleUnit): string[] {
  return unit.layers.slice(1);
}

function stylesBelowRoots(
  previous: Reusable,
  units: StyleUnit[],
): Record<string, Styles> {
  return Object.fromEntries(
    units
      .flatMap(belowRoot)
      .map((id): [string, Styles] => [id, previous.styles[id] ?? {}]),
  );
}

// Which layers' styles to read from Paper and which to take from the previous snapshot.
export function planStyleRead(input: StylePlanInput): StylePlan {
  const previous = input.previous ?? nothingToReuse;
  const { units, alwaysRead } = input.split;
  const unchanged = (unit: StyleUnit): boolean =>
    isReusable(previous, input.fingerprints, unit);
  const reusable = new Set(units.filter(unchanged));
  const changed = units.filter((unit): boolean => !reusable.has(unit));
  return {
    reused: stylesBelowRoots(previous, [...reusable]),
    read: [...alwaysRead, ...changed.flatMap(belowRoot)],
    reusedUnits: reusable.size,
    rereadUnits: changed.length,
  };
}
