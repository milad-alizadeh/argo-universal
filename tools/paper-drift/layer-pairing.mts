import { layerAt, type Layer, type Snapshot } from './snapshot-model.mts';

// Walks a master and a copy side by side and pairs their layers by position.
export interface PairingRules {
  // A registered master nested in this one is checked on its own, so the walk stops at it.
  isMaster: (name: string) => boolean;
  // Two names of one family: a copy may switch a nested layer to another state.
  isStateSwitch: (masterName: string, copyName: string) => boolean;
}

export interface LayerPair {
  path: string;
  master: Layer;
  copy: Layer;
}

interface StructureDrift extends LayerPair {
  problem: string;
}

export interface Pairing {
  pairs: LayerPair[];
  drift: StructureDrift[];
  // Nested masters and state switches: checked on their own, kept as they are by a sync.
  kept: LayerPair[];
}

interface Walk {
  snapshot: Snapshot;
  rules: PairingRules;
  pairing: Pairing;
}

type ChildVerdict = 'walk' | 'skip' | { problem: string };

function childPath(path: string, index: number): string {
  return path === '' ? String(index) : `${path}/${index}`;
}

function renamedVerdict(
  rules: PairingRules,
  master: Layer,
  copy: Layer,
): ChildVerdict {
  if (rules.isStateSwitch(master.name, copy.name)) return 'skip';
  return {
    problem: `is named "${copy.name}"; the master has "${master.name}"`,
  };
}

function nameVerdict(
  rules: PairingRules,
  master: Layer,
  copy: Layer,
): ChildVerdict {
  if (master.name !== copy.name) return renamedVerdict(rules, master, copy);
  return rules.isMaster(master.name) ? 'skip' : 'walk';
}

function childVerdict(
  rules: PairingRules,
  master: Layer,
  copy: Layer,
): ChildVerdict {
  if (master.type !== copy.type)
    return { problem: `is a ${copy.type}; the master has a ${master.type}` };
  return master.type === 'Frame' ? nameVerdict(rules, master, copy) : 'walk';
}

function childrenProblem(walk: Walk, pair: LayerPair): string | undefined {
  const names = (layer: Layer): string =>
    layer.children
      .map((id): string => layerAt(walk.snapshot, id).name)
      .join(', ');
  if (pair.master.children.length === pair.copy.children.length)
    return undefined;
  return `has ${pair.copy.children.length} children (${names(pair.copy)}); the master has ${pair.master.children.length} (${names(pair.master)})`;
}

function visitChild(walk: Walk, pair: LayerPair): void {
  const verdict = childVerdict(walk.rules, pair.master, pair.copy);
  if (verdict === 'walk') visit(walk, pair);
  else if (verdict === 'skip') walk.pairing.kept.push(pair);
  else walk.pairing.drift.push({ ...pair, ...verdict });
}

function childPair(walk: Walk, pair: LayerPair, index: number): LayerPair {
  return {
    path: childPath(pair.path, index),
    master: layerAt(walk.snapshot, pair.master.children[index] ?? ''),
    copy: layerAt(walk.snapshot, pair.copy.children[index] ?? ''),
  };
}

function visit(walk: Walk, pair: LayerPair): void {
  walk.pairing.pairs.push(pair);
  const problem = childrenProblem(walk, pair);
  if (problem) return void walk.pairing.drift.push({ ...pair, problem });
  for (const index of pair.master.children.keys())
    visitChild(walk, childPair(walk, pair, index));
}

export function pairLayers(
  snapshot: Snapshot,
  roots: { master: Layer; copy: Layer },
  rules: PairingRules,
): Pairing {
  const walk: Walk = {
    snapshot,
    rules,
    pairing: { pairs: [], drift: [], kept: [] },
  };
  visit(walk, { path: '', ...roots });
  return walk.pairing;
}

function stepsOf(path: string): number[] {
  return path === '' ? [] : path.split('/').map(Number);
}

export function layerAtPath(
  snapshot: Snapshot,
  root: Layer,
  path: string,
): Layer | undefined {
  return stepsOf(path).reduce<Layer | undefined>(
    (layer, step): Layer | undefined =>
      snapshot.layers[layer?.children[step] ?? ''],
    root,
  );
}
