import type {
  FeedChange,
  Notice,
  SessionUpdate,
  TurnEnd,
} from '@repo/contracts';

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

export type CommittedTurnEnding = { sessionId: string; turnId: string };

const argoMeta = (notice: Notice): NonNullable<Notice['_meta']>['argo'] =>
  notice._meta?.argo;

const endsTurn = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'notice' && argoMeta(row)?.turnEnd !== undefined;

const endedTurnIds = (row: SessionUpdate): string[] =>
  endsTurn(row) && row.turnId ? [row.turnId] : [];

// The Turns whose `turnEndChange` marker is among `rows`.
export const turnEndingsOf = (
  sessionId: string,
  rows: readonly SessionUpdate[],
): CommittedTurnEnding[] =>
  rows.flatMap(endedTurnIds).map((turnId) => ({ sessionId, turnId }));

export const restartTurnError = {
  code: 'interrupted',
  message: 'The Server stopped during the Turn',
} as const;
