import {
  structureDrift,
  styleDrift,
  variantInner,
  variantRoot,
  type Check,
  type CopyDrift,
  type LayerDrift,
} from './drift-model.mts';
import { layerAtPath, pairLayers, type LayerPair } from './layer-pairing.mts';
import {
  pairingRules,
  type MasterEntry,
  type Props,
  type Registry,
} from './registry.mts';
import {
  stylesOf,
  type Layer,
  type Snapshot,
  type Styles,
} from './snapshot-model.mts';
import { diffStyles } from './style-diff.mts';

interface Variation {
  base: Layer;
  layer: Layer;
  props: Props;
}

type Declared = [string, string | null][];

function unsetOf(declared: Declared): Set<string> {
  return new Set(
    declared
      .filter(([, value]): boolean => value === null)
      .map(([property]): string => property),
  );
}

function setOf(declared: Declared): [string, string][] {
  return declared.filter(
    (entry): entry is [string, string] => entry[1] !== null,
  );
}

// A variation must equal its base with its declared props applied.
export function expectedStyles(
  base: Styles,
  props: Props,
  path: string,
): Styles {
  const declared = Object.entries(props[path] ?? {});
  const unset = unsetOf(declared);
  const kept = Object.entries(base).filter(
    ([property]): boolean => !unset.has(property),
  );
  return Object.fromEntries([...kept, ...setOf(declared)]);
}

function pairDrift(check: Check, pair: LayerPair, props: Props): LayerDrift[] {
  const base = stylesOf(check.snapshot, pair.master.id);
  const expected = expectedStyles(base, props, pair.path);
  const allow = pair.path === '' ? variantRoot : variantInner;
  const actual = stylesOf(check.snapshot, pair.copy.id);
  return styleDrift(pair, diffStyles(expected, actual, allow));
}

function unknownPropPaths(check: Check, variation: Variation): LayerDrift[] {
  return Object.keys(variation.props)
    .filter(
      (path): boolean =>
        layerAtPath(check.snapshot, variation.base, path) === undefined,
    )
    .map((path): LayerDrift => ({
      path,
      layer: '?',
      problem: 'props name a layer path the base does not have',
    }));
}

function variantDrift(check: Check, variation: Variation): LayerDrift[] {
  const roots = { master: variation.base, copy: variation.layer };
  const pairing = pairLayers(check.snapshot, roots, check.rules);
  return [
    ...unknownPropPaths(check, variation),
    ...structureDrift(pairing),
    ...pairing.pairs.flatMap((pair): LayerDrift[] =>
      pairDrift(check, pair, variation.props),
    ),
  ];
}

function layerOf(
  snapshot: Snapshot,
  entry: MasterEntry | undefined,
): Layer | undefined {
  return entry === undefined ? undefined : snapshot.layers[entry.id];
}

function propsOf(entry: MasterEntry): Props {
  return entry.props ?? {};
}

function variationOf(
  snapshot: Snapshot,
  registry: Registry,
  entry: MasterEntry,
): Variation[] {
  const baseEntry = registry.masters.find(
    (candidate): boolean => candidate.name === entry.variantOf,
  );
  const base = layerOf(snapshot, baseEntry);
  const layer = layerOf(snapshot, entry);
  if (!base || !layer) return [];
  return [{ base, layer, props: propsOf(entry) }];
}

function variationDrift(check: Check, variation: Variation): CopyDrift[] {
  const drift = variantDrift(check, variation);
  if (drift.length === 0) return [];
  const { base, layer } = variation;
  return [{ master: base.name, masterId: base.id, copyId: layer.id, drift }];
}

export function findVariantDrift(
  snapshot: Snapshot,
  registry: Registry,
): CopyDrift[] {
  const check: Check = { snapshot, rules: pairingRules(registry) };
  return registry.masters
    .flatMap((entry): Variation[] => variationOf(snapshot, registry, entry))
    .flatMap((variation): CopyDrift[] => variationDrift(check, variation));
}
