import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedChange, PlanUpdate, SessionUpdate } from '@repo/contracts';
import {
  selectUnaddressedPlanRow,
  isUnaddressedPlan,
} from '../unaddressed-plan';
import type { ContentAssemblyInput, AssembledContent } from './assembly';
import { createScopedFeedRowId } from './identity';
import {
  createPlanContentMetadata,
  createPlanRow,
  mapPlanEntries,
} from './plan-content';

type UnaddressedPlanInput = ContentAssemblyInput & {
  update: Extract<SessionNotification['update'], { sessionUpdate: 'plan' }>;
};
const recoverUnaddressedPlanRow = (
  input: ContentAssemblyInput,
): PlanUpdate | undefined =>
  selectUnaddressedPlanRow(
    Object.values(input.feed.rows),
    input.acpSessionId,
  ) ?? input.findUnaddressedPlan?.(input.acpSessionId);
const readUnaddressedPlanRow = (
  input: ContentAssemblyInput,
): PlanUpdate | undefined => {
  const pointer = input.unaddressedPlan;
  const row = pointer
    ? input.findRow(pointer.rowId)
    : recoverUnaddressedPlanRow(input);
  if (!row) return undefined;
  return retainMatchingUnaddressedPlan(input, row);
};
const retainMatchingUnaddressedPlan = (
  input: ContentAssemblyInput,
  row: SessionUpdate,
): PlanUpdate | undefined => {
  if (!isUnaddressedPlan(row, input.acpSessionId)) return undefined;
  input.feed.rows[row.id] = row;
  return row;
};
const allocateLocalPlanRowId = (input: ContentAssemblyInput): string =>
  createScopedFeedRowId({
    acpSessionId: input.acpSessionId,
    kind: 'plan_update',
    localPosition: input.feed.nextPosition,
  });
const createUnaddressedPlanChange = (
  input: UnaddressedPlanInput,
  id: string,
): FeedChange => ({
  type: 'upsert',
  update: createPlanRow(
    id,
    {
      type: 'items',
      planId: id,
      entries: mapPlanEntries(input.update.entries),
    },
    createPlanContentMetadata(input, input.acpSessionId),
  ),
});
export const assembleUnaddressedPlan = (
  input: UnaddressedPlanInput,
): AssembledContent => {
  const id = readUnaddressedPlanRow(input)?.id ?? allocateLocalPlanRowId(input);
  return {
    change: createUnaddressedPlanChange(input, id),
    unaddressedPlan: { acpSessionId: input.acpSessionId, rowId: id },
  };
};
