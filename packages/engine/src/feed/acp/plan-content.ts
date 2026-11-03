import type {
  PlanEntry as AcpPlanEntry,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type { FeedUpdate, Plan, PlanEntry, PlanUpdate } from '@repo/contracts';
import { createAcpContentMetadata } from './content';
import { assignPresentField } from './present-field';

type PlanMetadata = NonNullable<NonNullable<PlanUpdate['_meta']>['argo']>;

type PlanMetadataInput = {
  update: Pick<SessionNotification['update'], '_meta'>;
  feed: { maxRevision: number };
};

export const mapPlanEntries = (entries: AcpPlanEntry[]): PlanEntry[] =>
  entries.map((entry) => ({
    content: entry.content,
    priority: entry.priority,
    status: entry.status,
    _meta: createAcpContentMetadata(entry._meta),
  }));

export const createPlanContentMetadata = (
  input: PlanMetadataInput,
  unaddressedPlanAcpSessionId?: string,
): PlanUpdate['_meta'] => {
  const extension: PlanMetadata = {
    removed: false,
    contentRevision: input.feed.maxRevision + 1,
  };

  assignPresentField(
    extension,
    'unaddressedPlanAcpSessionId',
    unaddressedPlanAcpSessionId,
  );

  return { ...createAcpContentMetadata(input.update._meta), argo: extension };
};

export const createPlanRow = (
  id: string,
  plan: Plan,
  metadata: PlanUpdate['_meta'],
): Extract<FeedUpdate, { sessionUpdate: 'plan_update' }> => ({
  id,
  sessionUpdate: 'plan_update',
  state: 'settled',
  plan,
  _meta: metadata,
});
