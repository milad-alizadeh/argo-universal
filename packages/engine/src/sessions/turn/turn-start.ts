import type { ContentBlock } from '@repo/contracts';
import { currentModel } from '../configuration/config-choices';
import type { SessionContext, SessionWrite } from '../session-context';
import { TurnInsertJob } from '../session-storage/session-storage';

export type StartTurnParameters = { turnId: string; content: ContentBlock[] };

type StartedTurn = {
  change: Pick<
    SessionContext,
    'activeTurnId' | 'activeTurnStartedAt' | 'turnEnding' | 'kept'
  >;
  write: SessionWrite;
};

const startChange = (
  turnId: string,
  startedAt: number,
): StartedTurn['change'] => ({
  activeTurnId: turnId,
  activeTurnStartedAt: startedAt,
  turnEnding: { kind: 'completion' },
  kept: true,
});

const startWrite = (
  context: SessionContext,
  turnId: string,
  startedAt: number,
): SessionWrite => ({
  job: new TurnInsertJob({
    turn: {
      id: turnId,
      sessionId: context.sessionId,
      startedAt,
      status: 'running',
      model: currentModel(context.configOptions),
    },
  }),
});

export const startTurn = (
  context: SessionContext,
  turnId: string,
): StartedTurn => {
  const startedAt = context.input.now();

  return {
    change: startChange(turnId, startedAt),
    write: startWrite(context, turnId, startedAt),
  };
};
