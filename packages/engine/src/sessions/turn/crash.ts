import { AgentProcessExitError } from '../../agents';
import { turnEndingEvent, type FeedTurnEnding } from '../../feed';
import type { AcpLifetimeEvent } from '../acp/acp-lifetime';
import type { SessionContext } from '../session-context';
import { crashedSubagentTurns } from './subagent-crash';
import { turnStep, type TurnStep } from './values';

type AcpFailed = Extract<AcpLifetimeEvent, { type: 'acp.failed' }>;

type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

type CrashedSession = Pick<
  SessionContext,
  'activeTurnId' | 'turnEnding' | 'subagents'
> & { input: Pick<SessionContext['input'], 'now'> };

const crashTitle = (failed: AcpFailed): string =>
  failed.error instanceof Error ? failed.error.message : String(failed.error);

const crashDescription = (failed: AcpFailed): string | undefined =>
  failed.error instanceof AgentProcessExitError
    ? failed.error.stderr || undefined
    : undefined;

const crashEnding = (
  context: CrashedSession,
  failed: AcpFailed,
): CrashEnding => ({
  kind: 'agent_crash',
  occurredAt: context.input.now(),
  title: crashTitle(failed),
  description: crashDescription(failed),
});

type CrashEffect = Pick<TurnStep, 'change' | 'feed'>;

// During a Turn the crash joins the Turn's ending, which the Feed settles.
const joinTurn = (
  context: CrashedSession,
  ending: CrashEnding,
): CrashEffect => ({
  change: { turnEnding: { ...context.turnEnding, ...ending } },
  feed: [],
});

// Outside a Turn the Feed shows the crash at once.
const announce = (
  context: CrashedSession,
  ending: CrashEnding,
): CrashEffect => ({
  change: {},
  feed: [{ type: turnEndingEvent, turnId: context.activeTurnId, ending }],
});

// The Agent crashed: each Subagent Turn it cut short ends, and the Turn it cut short ends with the crash.
export const crashAgent = (
  context: CrashedSession,
  failed: AcpFailed,
  duringTurn: boolean,
): TurnStep => {
  const ending = crashEnding(context, failed);

  const effect =
    duringTurn && context.activeTurnId
      ? joinTurn(context, ending)
      : announce(context, ending);

  return turnStep({
    ...crashedSubagentTurns(context.subagents, ending),
    ...effect,
  });
};
