import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  planContentRevision,
  type FeedChange,
  type Plan,
  type PlanUpdate,
  type SessionUpdate,
} from '@repo/contracts';
import { createAcpContentMetadata } from './content';
import { createScopedFeedRowId } from './identity';
import {
  createPlanContentMetadata,
  createPlanRow,
  mapPlanEntries,
} from './plan-content';

type PlanNotification = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'plan_update' | 'plan_removed' }
>;
type PlanInput = {
  update: PlanNotification;
  acpSessionId: string;
  feed: { maxRevision: number; nextPosition: number };
  findRow: (id: string) => SessionUpdate | undefined;
};
const replacePlanContent = (input: PlanInput, plan: Plan): FeedChange => ({
  type: 'upsert',
  update: createPlanRow(
    createScopedFeedRowId({
      acpSessionId: input.acpSessionId,
      kind: 'plan_update',
      upstreamId: plan.planId,
    }),
    plan,
    createPlanContentMetadata(input),
  ),
});
const mapPlanContent = (
  plan: Extract<PlanNotification, { sessionUpdate: 'plan_update' }>['plan'],
): Plan => {
  const _meta = createAcpContentMetadata(plan._meta);
  if (plan.type === 'items')
    return { ...plan, entries: mapPlanEntries(plan.entries), _meta };
  return { ...plan, _meta };
};
const createRemovedPlanMetadata = (
  existing: PlanUpdate,
  update: PlanNotification,
): PlanUpdate['_meta'] => ({
  ...existing._meta,
  ...createAcpContentMetadata(update._meta),
  argo: {
    ...existing._meta?.argo,
    removed: true,
    contentRevision: planContentRevision(existing),
  },
});
const removePlanFromActivePresentation = (
  input: PlanInput,
  planId: string,
): FeedChange | { rejection: string } => {
  const id = createScopedFeedRowId({
    acpSessionId: input.acpSessionId,
    kind: 'plan_update',
    upstreamId: planId,
  });
  const existing = input.findRow(id);
  if (existing?.sessionUpdate !== 'plan_update')
    return { rejection: `Cannot remove unknown ACP Plan ${planId}` };
  return createPlanRemovalPatch(existing, input.update);
};
const createPlanRemovalPatch = (
  existing: PlanUpdate,
  update: PlanNotification,
): FeedChange => ({
  type: 'patch',
  id: existing.id,
  set: { _meta: createRemovedPlanMetadata(existing, update) },
});
export const assemblePlanUpdate = (
  input: PlanInput,
): FeedChange | { rejection: string } => {
  if (input.update.sessionUpdate === 'plan_removed')
    return removePlanFromActivePresentation(input, input.update.planId);
  return replacePlanContent(input, mapPlanContent(input.update.plan));
};
