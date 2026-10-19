import { createHash } from 'node:crypto';
import type { Location } from './catalog.mts';
import type { Binding, Snapshot } from './model.mts';
import { required } from './model.mts';

export function structure(snapshot: Snapshot): string {
  const nodes = new Map(snapshot.nodes.map((node) => [node.id, node]));

  function structureOf(id: string): string {
    const node = required(nodes.get(id));

    return JSON.stringify([
      node.name,
      node.component,
      node.childIds.map(structureOf),
    ]);
  }

  return createHash('sha256')
    .update(structureOf(snapshot.rootId))
    .digest('hex');
}

export function sameFlow(
  first: Location | undefined,
  second: Location,
): boolean {
  if (!first) return false;

  return (
    [first.page, first.board, first.flow].join('\0') ===
    [second.page, second.board, second.flow].join('\0')
  );
}

export function rebindCandidates(
  prior: Binding,
  candidates: Binding[],
): Binding[] {
  return candidates.filter(
    (candidate) =>
      candidate.name === prior.name &&
      sameFlow(prior.location, required(candidate.location)) &&
      candidate.structure === prior.structure,
  );
}

export function rebind(prior: Binding, candidates: Binding[]): Binding {
  const matches = rebindCandidates(prior, candidates);

  if (matches.length !== 1)
    throw new Error(
      `${prior.name}: expected one rebind candidate in the same flow; found ${matches.length}`,
    );
  const next = structuredClone(required(matches[0]));
  next.textOverrides = { ...prior.textOverrides, ...next.textOverrides };

  return next;
}
