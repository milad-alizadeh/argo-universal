import type { SessionInfo } from '@repo/contracts';
import { sessionRows } from '@repo/mocks/app';

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
