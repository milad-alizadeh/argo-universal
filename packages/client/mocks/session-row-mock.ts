import { sessionRows } from '@repo/api/mocks';
import type { SessionInfo } from '@repo/contracts';

export const sessionRowMocks = {
  planAndSubagents: {
    ...sessionRows.withPlan,
    subagents: sessionRows.withSubagents.subagents,
  },
  finishedSubagents: {
    ...sessionRows.idle,
    plan: { done: 5, total: 5 },
    subagents: { running: 0, total: 3 },
  },
} satisfies Record<string, SessionInfo>;
