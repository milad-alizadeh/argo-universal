import { checkedCopies } from './copy-drift.mts';
import type { MasterEntry, Registry } from './registry.mts';
import type { Layer, Snapshot } from './snapshot-model.mts';
import { isPlacement } from './style-diff.mts';

// Warnings for an agent that just edited Paper layers, read against the last snapshot.
export interface EditTarget {
  nodeId: string;
  // The style properties an update_styles call set on this layer.
  styles: string[];
}

export interface PaperEdit {
  tool: string;
  targets: EditTarget[];
}

interface Hit {
  entry: MasterEntry;
  // The master or copy root that holds the edited layer.
  root: Layer;
  isMaster: boolean;
}

function ancestry(snapshot: Snapshot, id: string): Layer[] {
  const chain: Layer[] = [];
  for (let at = snapshot.layers[id]; at; at = snapshot.layers[at.parent ?? ''])
    chain.push(at);
  return chain;
}

function hitOf(registry: Registry, layer: Layer): Hit | undefined {
  const entry = registry.masters.find(
    (master): boolean => master.id === layer.id || master.name === layer.name,
  );
  return entry && { entry, root: layer, isMaster: entry.id === layer.id };
}

// The nearest registered master, or copy of one, that holds the layer.
function nearestHit(
  snapshot: Snapshot,
  registry: Registry,
  id: string,
): Hit | undefined {
  for (const layer of ancestry(snapshot, id)) {
    const hit = hitOf(registry, layer);
    if (hit) return hit;
  }
  return undefined;
}

// A copy may hide any layer and place its root; any other style is drift.
function isAllowedStyle(
  hit: Hit,
  target: EditTarget,
  property: string,
): boolean {
  if (property === 'display') return true;
  return isPlacement(property) && target.nodeId === hit.root.id;
}

function isAllowedOnCopy(
  edit: PaperEdit,
  hit: Hit,
  target: EditTarget,
): boolean {
  if (edit.tool === 'set_text_content') return true;
  if (edit.tool !== 'update_styles') return false;
  return target.styles.every((property): boolean =>
    isAllowedStyle(hit, target, property),
  );
}

function masterWarning(
  snapshot: Snapshot,
  registry: Registry,
  hit: Hit,
): string {
  const { name } = hit.entry;
  const count = checkedCopies(snapshot, registry, hit.entry).length;
  return `You edited the master "${name}"; its ${count} copies may now drift. When the master is done, run pnpm paper:snapshot, then pnpm paper:sync "${name}" and check the dry run.`;
}

function copyWarning(entry: MasterEntry): string {
  return `You edited a copy of "${entry.name}" beyond its text, hiding and placement. Make the change on the master and sync it, or pnpm paper:audit will report this copy.`;
}

interface Check {
  snapshot: Snapshot;
  registry: Registry;
  edit: PaperEdit;
}

function hitWarnings(check: Check, hit: Hit, target: EditTarget): string[] {
  if (hit.isMaster) return [masterWarning(check.snapshot, check.registry, hit)];
  return isAllowedOnCopy(check.edit, hit, target)
    ? []
    : [copyWarning(hit.entry)];
}

function targetWarnings(check: Check, target: EditTarget): string[] {
  const hit = nearestHit(check.snapshot, check.registry, target.nodeId);
  return hit ? hitWarnings(check, hit, target) : [];
}

export function editWarnings(
  snapshot: Snapshot,
  registry: Registry,
  edit: PaperEdit,
): string[] {
  const check = { snapshot, registry, edit };
  const warnings = edit.targets.flatMap((target): string[] =>
    targetWarnings(check, target),
  );
  return [...new Set(warnings)];
}
