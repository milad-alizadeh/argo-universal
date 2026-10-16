import type { FeedChange, TurnEnd } from '@repo/contracts';

// A durable Feed marker: #148 owns its drawing, separately from crash Notices.
export const turnEndChange = (turnId: string, end: TurnEnd): FeedChange => ({
  type: 'upsert',
  update: {
    id: `${turnId}:end`,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'info',
    title: 'Turn ended',
    _meta: { argo: { turnEnd: end } },
  },
});

export const restartTurnError = {
  code: 'interrupted',
  message: 'The Server stopped during the Turn',
} as const;
