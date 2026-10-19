import { key, nodeMap } from './catalog.mts';
import type { EnrollmentContext } from './enrollment-model.mts';
import type { Binding, Registry } from './model.mts';
import { rebind, rebindCandidates } from './rebind.mts';

function candidatesFor(
  context: EnrollmentContext,
  prior: Binding,
  family: Registry['families'][number],
): Binding[] {
  const ids = claimedIds(context);

  return rebindCandidates(
    prior,
    family.copies.filter((copy) => !ids.has(`${copy.fileId}:${copy.nodeId}`)),
  );
}

function accept(
  context: EnrollmentContext,
  prior: Binding,
  candidates: Binding[],
): Binding {
  const next = rebind(prior, candidates);
  context.result.rebindings.push({ from: prior, to: next });

  return next;
}

function offer(
  context: EnrollmentContext,
  prior: Binding,
  candidates: Binding[],
): Binding {
  const { fileId, nodeId, name } = prior;
  const reason = `Registered ID is gone; ${candidates.length} same-flow structure matches. Run enroll --rebind to accept a unique match.`;
  context.result.excluded.push({ fileId, nodeId, name, reason });

  return prior;
}

function repairCopy(context: EnrollmentContext, prior: Binding): void {
  const family = context.result.registry.families.find(
    (item) => item.name === prior.name,
  );

  if (!family) return;
  repairFamily(context, prior, family);
}

function repairFamily(
  context: EnrollmentContext,
  prior: Binding,
  family: Registry['families'][number],
): void {
  const candidates = candidatesFor(context, prior, family);

  const next = canRebind(context, candidates)
    ? accept(context, prior, candidates)
    : offer(context, prior, candidates);

  family.copies = family.copies.filter(
    (copy) =>
      `${copy.fileId}:${copy.nodeId}` !== `${next.fileId}:${next.nodeId}`,
  );
  family.copies.push(next);
}

export function repairMissing(context: EnrollmentContext): void {
  const index = nodeMap(context.catalog.nodes);

  for (const copy of context.previous.families.flatMap(
    (family) => family.copies,
  ))
    if (!index.has(key({ fileId: copy.fileId, id: copy.nodeId })))
      repairCopy(context, copy);
}

function canRebind(context: EnrollmentContext, candidates: Binding[]): boolean {
  return context.rebind && candidates.length === 1;
}

function claimedIds(context: EnrollmentContext): Set<string> {
  const previous = context.previous.families.flatMap((family) => family.copies);
  const claimed = context.result.rebindings.map((pair) => pair.to);

  return new Set(
    [...previous, ...claimed].map((copy) => `${copy.fileId}:${copy.nodeId}`),
  );
}
