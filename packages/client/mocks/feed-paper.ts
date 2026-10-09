import type {
  CompactionUpdate,
  Notice,
  PlanMarkdown,
  ResourceLink,
} from '@repo/contracts';
import { recordedAcpContent } from './acp-feed-content';
import { longPlanProposal } from './plan-proposal-mock';

export const resourceReferences = [
  {
    type: 'resource_link',
    name: 'Feed paging notes',
    uri: 'file:///Users/milad/Developer/argo-universal/docs/research/feed-paging.md',
    description:
      'Why sequence cursors beat page offsets once rows arrive out of order.',
  },
  {
    type: 'resource_link',
    name: 'session-trace.json',
    uri: 'mcp://observability/sessions/7f3c9a2e-41b8-4d0c/traces/session-trace.json',
  },
] satisfies ResourceLink[];
export const embeddedResource = {
  name: 'paging.sql',
  uri: 'file:///Users/milad/Developer/argo-universal/packages/db/queries/paging.sql',
  text: 'SELECT id, sequence, payload\nFROM feed_rows\nWHERE session_id = $1 AND sequence < $2\nORDER BY sequence DESC\nLIMIT 50;',
};

const recording = recordedAcpContent('agent-1');
const compaction = recording.rows.find(
  (row) => row.sessionUpdate === 'compaction_update',
);
const notice = recording.rows.find((row) => row.sessionUpdate === 'notice');
if (!compaction || !notice)
  throw new Error('ACP recording needs Compaction and Notice rows');
export const compactionStates = [
  { ...compaction, status: 'in_progress', summary: undefined },
  {
    ...compaction,
    status: 'completed',
    summary: [
      {
        type: 'text',
        text: 'Built the Session layout. The Feed reader now uses sequence cursors.',
      },
    ],
  },
  {
    ...compaction,
    status: 'failed',
    summary: undefined,
    error: 'The Agent could not compact context.',
  },
  { ...compaction, status: 'cancelled', summary: undefined },
] satisfies CompactionUpdate[];
export const noticeStates = [
  {
    ...notice,
    severity: 'info',
    title: 'The Agent restarted after it quit; the Turn carried on',
    description: undefined,
  },
  {
    ...notice,
    severity: 'warning',
    title: 'Rate limited · retrying (2 of 5)',
    description: undefined,
  },
  {
    ...notice,
    severity: 'error',
    title: "The Agent couldn't reach the model",
    description:
      'Gave up after 5 tries. Check the network, then send the message again.',
  },
  {
    ...notice,
    severity: 'unrecognised',
    title: "The Agent sent something Argo doesn't show yet",
    description: undefined,
  },
] satisfies Notice[];

export const longWrittenPlan: PlanMarkdown = {
  type: 'markdown',
  planId: 'long-written-plan',
  content: `${longPlanProposal.content}\n\nEnd of the written plan.`,
};
