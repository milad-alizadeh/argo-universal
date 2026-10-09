import type { LayerPair, Pairing, PairingRules } from './layer-pairing.mts';
import type { Snapshot } from './snapshot-model.mts';
import type { Allowances, StyleChange } from './style-diff.mts';

// One copy (or variation) and every way it differs from what it should be.
export interface LayerDrift {
  path: string;
  layer: string;
  problem?: string;
  changes?: StyleChange[];
}

export interface CopyDrift {
  master: string;
  masterId: string;
  copyId: string;
  drift: LayerDrift[];
}

export interface Check {
  snapshot: Snapshot;
  rules: PairingRules;
}

// A copy may place its root and hide layers; a variation may only place its root.
export const copyRoot: Allowances = { placement: true, hiding: true };
export const copyInner: Allowances = { placement: false, hiding: true };
export const variantRoot: Allowances = { placement: true, hiding: false };
export const variantInner: Allowances = { placement: false, hiding: false };

export function styleDrift(
  pair: LayerPair,
  changes: StyleChange[],
): LayerDrift[] {
  if (changes.length === 0) return [];
  return [{ path: pair.path, layer: pair.copy.name, changes }];
}

export function structureDrift(pairing: Pairing): LayerDrift[] {
  return pairing.drift.map((found): LayerDrift => ({
    path: found.path,
    layer: found.copy.name,
    problem: found.problem,
  }));
}
