import { variantRoot } from './drift-model.mts';
import {
  pairLayers,
  type LayerPair,
  type PairingRules,
} from './layer-pairing.mts';
import type { MasterEntry, Props } from './registry.mts';
import { stylesOf, type Layer, type Snapshot } from './snapshot-model.mts';
import { diffStyles, strict, type StyleChange } from './style-diff.mts';

// Masters named "Family / State" form a family: one base and its variations.
const FAMILY_SEPARATOR = ' / ';

type LayerProps = Props[string];

interface Family {
  snapshot: Snapshot;
  rules: PairingRules;
  base: Layer;
}

function familyName(name: string): string {
  return name.split(FAMILY_SEPARATOR)[0] ?? name;
}

export function familyRules(names: Set<string>): PairingRules {
  return {
    isMaster: (name): boolean => names.has(name),
    isStateSwitch: (masterName, copyName): boolean =>
      names.has(masterName) && familyName(masterName) === familyName(copyName),
  };
}

function layerProps(changes: StyleChange[]): LayerProps {
  return Object.fromEntries(
    changes.map((change): [string, string | null] => [
      change.property,
      change.copy ?? null,
    ]),
  );
}

function propsAt(snapshot: Snapshot, pair: LayerPair): [string, LayerProps][] {
  const allow = pair.path === '' ? variantRoot : strict;
  const base = stylesOf(snapshot, pair.master.id);
  const changes = diffStyles(base, stylesOf(snapshot, pair.copy.id), allow);
  if (changes.length === 0) return [];
  return [[pair.path, layerProps(changes)]];
}

// A variation shares its base's layers; its props are every style it sets differently.
function propsBetween(family: Family, layer: Layer): Props | undefined {
  const roots = { master: family.base, copy: layer };
  const pairing = pairLayers(family.snapshot, roots, family.rules);
  if (pairing.drift.length > 0) return undefined;
  return Object.fromEntries(
    pairing.pairs.flatMap((pair): [string, LayerProps][] =>
      propsAt(family.snapshot, pair),
    ),
  );
}

export function entryOf(layer: Layer): MasterEntry {
  return { name: layer.name, id: layer.id };
}

// A member whose layers differ from the base's stays a master of its own.
function memberEntry(family: Family, layer: Layer): MasterEntry {
  if (layer === family.base) return entryOf(layer);
  const props = propsBetween(family, layer);
  if (props === undefined) return entryOf(layer);
  return { ...entryOf(layer), variantOf: family.base.name, props };
}

function baseOf(members: Layer[]): Layer | undefined {
  const named = members.find(
    (layer): boolean => !layer.name.includes(FAMILY_SEPARATOR),
  );
  return named ?? members[0];
}

// The frame named after the family is its base; failing that, the first one on the boards.
export function familyEntries(
  snapshot: Snapshot,
  rules: PairingRules,
  members: Layer[],
): MasterEntry[] {
  const base = baseOf(members);
  if (!base) return [];
  const family = { snapshot, rules, base };
  return members.map((layer): MasterEntry => memberEntry(family, layer));
}

export function familiesOf(layers: Layer[]): Layer[][] {
  const families = new Map<string, Layer[]>();
  for (const layer of layers) {
    const members = families.get(familyName(layer.name)) ?? [];
    families.set(familyName(layer.name), [...members, layer]);
  }
  return [...families.values()];
}
