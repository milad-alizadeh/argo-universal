import type { CompactionUpdate, Notice, PlanMarkdown } from '@repo/contracts';
import { recordedAcpContent } from './acp-feed-content';
import { longPlanProposal } from './plan-proposal-mock';

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
    summary: undefined,
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
