import { copiesOf } from './copy-drift.mts';
import type { MasterEntry, Registry } from './registry.mts';
import type { Layer, Snapshot } from './snapshot-model.mts';

// Warnings for an agent that just edited Paper layers, read against the last snapshot.
export interface PaperEdit {
  tool: string;
  nodeIds: string[];
}

interface Hit {
  entry: MasterEntry;
  isMaster: boolean;
}

// A copy may change its text, so a text edit inside a copy is not drift.
const COPY_SAFE_TOOLS = new Set(['set_text_content']);

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
  return entry && { entry, isMaster: entry.id === layer.id };
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

function masterWarning(snapshot: Snapshot, entry: MasterEntry): string {
  const count = copiesOf(snapshot, entry).length;
  return `You edited the master "${entry.name}"; its ${count} copies now drift. When the master is done, run pnpm paper:snapshot, then pnpm paper:sync "${entry.name}" and check the dry run.`;
}

function copyWarning(entry: MasterEntry): string {
  return `You edited a copy of "${entry.name}". Copies may change only text, hiding and placement; make the change on the master and sync it, or pnpm paper:audit will report this copy.`;
}

function warningOf(snapshot: Snapshot, edit: PaperEdit, hit: Hit): string[] {
  if (hit.isMaster) return [masterWarning(snapshot, hit.entry)];
  return COPY_SAFE_TOOLS.has(edit.tool) ? [] : [copyWarning(hit.entry)];
}

export function editWarnings(
  snapshot: Snapshot,
  registry: Registry,
  edit: PaperEdit,
): string[] {
  const warnings = edit.nodeIds.flatMap((id): string[] => {
    const hit = nearestHit(snapshot, registry, id);
    return hit ? warningOf(snapshot, edit, hit) : [];
  });
  return [...new Set(warnings)];
}
