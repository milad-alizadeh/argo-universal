import {
  copyInner,
  copyRoot,
  structureDrift,
  styleDrift,
  type Check,
  type CopyDrift,
  type LayerDrift,
} from './drift-model.mts';
import { pairLayers, type LayerPair } from './layer-pairing.mts';
import { pairingRules, type MasterEntry, type Registry } from './registry.mts';
import { stylesOf, type Layer, type Snapshot } from './snapshot-model.mts';
import { diffStyles } from './style-diff.mts';

// Every other layer with a master's name is a copy of it, on screens and boards alike.
export function copiesOf(
  snapshot: Snapshot,
  master: { name: string; id: string },
): Layer[] {
  return Object.values(snapshot.layers).filter(
    (layer): boolean => layer.name === master.name && layer.id !== master.id,
  );
}

function artboardName(snapshot: Snapshot, layer: Layer): string {
  return snapshot.layers[layer.artboard]?.name ?? '';
}

// The copies the audit and sync check: none on an ignored artboard.
export function checkedCopies(
  snapshot: Snapshot,
  registry: Registry,
  master: MasterEntry,
): Layer[] {
  const ignored = new Set(registry.ignoredArtboards);
  return copiesOf(snapshot, master).filter(
    (copy): boolean => !ignored.has(artboardName(snapshot, copy)),
  );
}

function pairDrift(check: Check, pair: LayerPair): LayerDrift[] {
  const allow = pair.path === '' ? copyRoot : copyInner;
  const master = stylesOf(check.snapshot, pair.master.id);
  const copy = stylesOf(check.snapshot, pair.copy.id);
  return styleDrift(pair, diffStyles(master, copy, allow));
}

function walkedDrift(check: Check, master: Layer, copy: Layer): LayerDrift[] {
  const pairing = pairLayers(check.snapshot, { master, copy }, check.rules);
  return [
    ...structureDrift(pairing),
    ...pairing.pairs.flatMap((pair): LayerDrift[] => pairDrift(check, pair)),
  ];
}

// A shell holds different content in each use, so only its root is compared.
function copyDrift(
  check: Check,
  entry: MasterEntry,
  copy: Layer,
): LayerDrift[] {
  const master = check.snapshot.layers[entry.id];
  if (!master) return [];
  if (entry.shell) return pairDrift(check, { path: '', master, copy });
  return walkedDrift(check, master, copy);
}

function copyFinding(check: Check, entry: MasterEntry, copy: Layer): CopyDrift {
  return {
    master: entry.name,
    masterId: entry.id,
    copyId: copy.id,
    drift: copyDrift(check, entry, copy),
  };
}

export function findCopyDrift(
  snapshot: Snapshot,
  registry: Registry,
): CopyDrift[] {
  const check: Check = { snapshot, rules: pairingRules(registry) };
  return registry.masters
    .flatMap((entry): CopyDrift[] =>
      checkedCopies(snapshot, registry, entry).map((copy): CopyDrift =>
        copyFinding(check, entry, copy),
      ),
    )
    .filter((found): boolean => found.drift.length > 0);
}
