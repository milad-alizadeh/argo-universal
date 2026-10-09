import { checkedCopies } from './copy-drift.mts';
import { kindOf, type Kind, type Scope } from './master-kind.mts';
import { presentedFrames } from './presented.mts';
import type { MasterEntry, Registry } from './registry.mts';
import type { Layer, Snapshot } from './snapshot-model.mts';
import {
  entryOf,
  familiesOf,
  familyEntries,
  familyRules,
} from './variation-families.mts';

// A first registry from the component boards, for a person to review before it is committed.
interface SkippedName {
  name: string;
  reason: string;
}

export interface Bootstrap {
  registry: Registry;
  skipped: SkippedName[];
}

interface Candidate {
  layer: Layer;
  kind: Kind;
}

function candidatesOf(snapshot: Snapshot, scope: Scope): Candidate[] {
  const demos = new Set(scope.notComponents);
  return presentedFrames(snapshot)
    .filter((layer): boolean => !demos.has(layer.name))
    .map((layer): Candidate => ({
      layer,
      kind: kindOf(snapshot, scope, layer),
    }));
}

function layersOf(candidates: Candidate[], kind: Kind): Layer[] {
  return candidates
    .filter((candidate): boolean => candidate.kind === kind)
    .map((candidate): Layer => candidate.layer);
}

function skippedOf(
  snapshot: Snapshot,
  scope: Scope,
  candidates: Candidate[],
): SkippedName[] {
  return layersOf(candidates, 'skip').map((layer): SkippedName => ({
    name: layer.name,
    reason: `${checkedCopies(snapshot, scope, layer).length} frames share the name, but most match neither its children nor its root styles`,
  }));
}

function entriesOf(snapshot: Snapshot, candidates: Candidate[]): MasterEntry[] {
  const masters = layersOf(candidates, 'master');
  const shells = layersOf(candidates, 'shell');
  const names = [...masters, ...shells].map((layer): string => layer.name);
  const rules = familyRules(new Set(names));
  return [
    ...familiesOf(masters).flatMap((members): MasterEntry[] =>
      familyEntries(snapshot, rules, members),
    ),
    ...shells.map((layer): MasterEntry => ({ ...entryOf(layer), shell: true })),
  ];
}

// The scope comes from the committed registry, so a proposal keeps its ignored boards and demos.
export function bootstrapRegistry(
  snapshot: Snapshot,
  scope: Scope = {},
): Bootstrap {
  const candidates = candidatesOf(snapshot, scope);
  const masters = entriesOf(snapshot, candidates);
  return {
    registry: { fileId: snapshot.fileId, ...scope, masters },
    skipped: skippedOf(snapshot, scope, candidates),
  };
}
