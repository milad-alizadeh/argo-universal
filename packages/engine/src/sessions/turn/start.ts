import { currentModel } from '../configuration';
import type { SessionContext, SessionWrite } from '../session-context';
import { TurnInsertJob } from '../session-storage/session-storage';
import { turnStep, type TurnStep } from './step';

type StartingSession = Pick<SessionContext, 'sessionId' | 'configOptions'> & {
  input: Pick<SessionContext['input'], 'now'>;
};

type StartChange = Pick<
  SessionContext,
  'activeTurnId' | 'activeTurnStartedAt' | 'turnEnding' | 'kept'
>;

const startChange = (turnId: string, startedAt: number): StartChange => ({
  activeTurnId: turnId,
  activeTurnStartedAt: startedAt,
  turnEnding: { kind: 'completion' },
  kept: true,
});

const startWrite = (
  context: StartingSession,
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

// A Turn begins: it is active, and stored as running with the model the Session runs now.
export const startTurn = (
  context: StartingSession,
  turnId: string,
): TurnStep<StartChange> => {
  const startedAt = context.input.now();

  return turnStep({
    change: startChange(turnId, startedAt),
    writes: [startWrite(context, turnId, startedAt)],
  });
};
