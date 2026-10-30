import { AgentProcessExitError, type ExitNotice } from '../../agents';
import { turnEndingEvent } from '../../feed';
import type { AcpLifetimeEvent } from '../acp/acp-lifetime';
import type { SessionContext } from '../session-context';
import { turnStep, type CrashEnding, type TurnStep } from './step';
import { crashedSubagentTurns } from './subagent-crash';

type AcpFailed = Extract<AcpLifetimeEvent, { type: 'acp.failed' }>;

type CrashedSession = Pick<
  SessionContext,
  'activeTurnId' | 'turnEnding' | 'subagents'
> & { input: Pick<SessionContext['input'], 'now'> };

const crashNotice = (failed: AcpFailed): ExitNotice =>
  failed.error instanceof AgentProcessExitError
    ? failed.error.notice
    : {
        title:
          failed.error instanceof Error
            ? failed.error.message
            : String(failed.error),
        description: undefined,
      };

const crashEnding = (
  context: CrashedSession,
  failed: AcpFailed,
): CrashEnding => ({
  kind: 'agent_crash',
  occurredAt: context.input.now(),
  ...crashNotice(failed),
});

type CrashChange = Pick<SessionContext, 'turnEnding'>;

// During a Turn the crash joins the Turn's ending, which the Feed settles.
const joinTurn = (
  context: CrashedSession,
  ending: CrashEnding,
): Pick<TurnStep<CrashChange>, 'change'> => ({
  change: { turnEnding: { ...context.turnEnding, ...ending } },
});

// Outside a Turn the Feed shows the crash at once.
const announce = (
  context: CrashedSession,
  ending: CrashEnding,
): Pick<TurnStep<CrashChange>, 'feed'> => ({
  feed: [{ type: turnEndingEvent, turnId: context.activeTurnId, ending }],
});

// The Agent crashed: each Subagent Turn it cut short ends, and the Turn it cut short ends with the crash.
export const crashAgent = (
  context: CrashedSession,
  failed: AcpFailed,
  duringTurn: boolean,
): TurnStep<CrashChange> => {
  const ending = crashEnding(context, failed);

  const effect =
    duringTurn && context.activeTurnId
      ? joinTurn(context, ending)
      : announce(context, ending);

  return turnStep({
    ...effect,
    subagentTurns: crashedSubagentTurns(context.subagents, ending),
  });
};
