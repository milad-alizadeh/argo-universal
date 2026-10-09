import type {
  PlanEntry as AcpPlanEntry,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type { FeedUpdate, Plan, PlanEntry, PlanUpdate } from '@repo/contracts';
import { createAcpContentMetadata } from './content';

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
): PlanUpdate['_meta'] => ({
  ...createAcpContentMetadata(input.update._meta),
  argo: {
    removed: false,
    contentRevision: input.feed.maxRevision + 1,
    ...(unaddressedPlanAcpSessionId === undefined
      ? {}
      : { unaddressedPlanAcpSessionId }),
  },
});
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
