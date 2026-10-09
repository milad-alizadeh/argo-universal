import { checkedCopies } from './copy-drift.mts';
import { copyInner, copyRoot } from './drift-model.mts';
import { pairLayers, type LayerPair, type Pairing } from './layer-pairing.mts';
import { pairingRules, type MasterEntry, type Registry } from './registry.mts';
import {
  layerPath,
  stylesOf,
  type Layer,
  type Snapshot,
  type Styles,
} from './snapshot-model.mts';
import { diffStyles, isPlacement } from './style-diff.mts';
import type { Blocked, SyncPlan, SyncPlans } from './sync-model.mts';

interface Context {
  snapshot: Snapshot;
  master: Layer;
}

function fixesOf(snapshot: Snapshot, pairs: LayerPair[]): number {
  return pairs
    .map((pair): number => {
      const allow = pair.path === '' ? copyRoot : copyInner;
      const master = stylesOf(snapshot, pair.master.id);
      return diffStyles(master, stylesOf(snapshot, pair.copy.id), allow).length;
    })
    .reduce((sum, count): number => sum + count, 0);
}

function placementOf(snapshot: Snapshot, copy: Layer): Styles {
  return Object.fromEntries(
    Object.entries(stylesOf(snapshot, copy.id)).filter(([property]): boolean =>
      isPlacement(property),
    ),
  );
}

function displayOf(snapshot: Snapshot, layer: Layer): string | undefined {
  const value = stylesOf(snapshot, layer.id)['display'];
  return value === undefined ? undefined : String(value);
}

function hidingOf(snapshot: Snapshot, pair: LayerPair): [string, string][] {
  const master = displayOf(snapshot, pair.master);
  const copy = displayOf(snapshot, pair.copy);
  const hides = (master === 'none') !== (copy === 'none');
  return hides ? [[pair.master.id, copy ?? 'flex']] : [];
}

function idsOf(pairs: LayerPair[]): [string, string][] {
  return pairs.map((pair): [string, string] => [pair.master.id, pair.copy.id]);
}

function copyFields(
  snapshot: Snapshot,
  copy: Layer,
): Pick<SyncPlan, 'copyId' | 'copyPath' | 'parentId' | 'placement'> {
  return {
    copyId: copy.id,
    copyPath: layerPath(snapshot, copy),
    parentId: copy.parent ?? '',
    placement: placementOf(snapshot, copy),
  };
}

function planOf(context: Context, copy: Layer, pairing: Pairing): SyncPlan {
  const { snapshot, master } = context;
  const { pairs } = pairing;
  const texts = pairs.filter((pair): boolean => pair.copy.type === 'Text');
  return {
    ...copyFields(snapshot, copy),
    masterId: master.id,
    fixes: fixesOf(snapshot, pairs),
    texts: idsOf(texts),
    display: pairs.flatMap((pair): [string, string][] =>
      hidingOf(snapshot, pair),
    ),
    kept: idsOf(pairing.kept),
  };
}

function blockedOf(snapshot: Snapshot, copy: Layer, reason: string): Blocked {
  return { copyId: copy.id, copyPath: layerPath(snapshot, copy), reason };
}

function problemsOf(pairing: Pairing): string {
  return pairing.drift
    .map((found): string => `${found.path || 'root'} ${found.problem}`)
    .join('; ');
}

function planCopy(
  context: Context,
  registry: Registry,
  copy: Layer,
): SyncPlans {
  const roots = { master: context.master, copy };
  const pairing = pairLayers(context.snapshot, roots, pairingRules(registry));
  if (pairing.drift.length > 0)
    return {
      plans: [],
      blocked: [blockedOf(context.snapshot, copy, problemsOf(pairing))],
    };
  const plan = planOf(context, copy, pairing);
  return { plans: plan.fixes > 0 ? [plan] : [], blocked: [] };
}

function merged(parts: SyncPlans[]): SyncPlans {
  return {
    plans: parts.flatMap((part): SyncPlan[] => part.plans),
    blocked: parts.flatMap((part): Blocked[] => part.blocked),
  };
}

function entryNamed(registry: Registry, name: string): MasterEntry {
  const entry = registry.masters.find(
    (candidate): boolean => candidate.name === name,
  );
  if (!entry) throw new Error(`"${name}" is not a registered master.`);
  if (entry.shell)
    throw new Error(
      `"${name}" is a shell: its copies hold their own content, so it is not synced.`,
    );
  return entry;
}

function masterOf(snapshot: Snapshot, entry: MasterEntry): Layer {
  const master = snapshot.layers[entry.id];
  if (!master)
    throw new Error(
      `The master "${entry.name}" (${entry.id}) is not in the snapshot.`,
    );
  return master;
}

export function planSync(
  snapshot: Snapshot,
  registry: Registry,
  name: string,
): SyncPlans {
  const entry = entryNamed(registry, name);
  const context = { snapshot, master: masterOf(snapshot, entry) };
  return merged(
    checkedCopies(snapshot, registry, entry).map((copy): SyncPlans =>
      planCopy(context, registry, copy),
    ),
  );
}
