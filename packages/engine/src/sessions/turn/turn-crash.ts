import { AgentProcessExitError } from '../../agents';
import {
  turnEndingEvent,
  type FeedEvent,
  type FeedTurnEnding,
} from '../../feed';
import type { AcpLifetimeEvent } from '../acp/acp-lifetime';
import type { SessionContext } from '../session-context';
import { crashedSubagentTurns } from '../subagents';

type AcpFailed = Extract<AcpLifetimeEvent, { type: 'acp.failed' }>;

type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

type Crash = {
  // Each Subagent Turn the crash cut short.
  subagents: ReturnType<typeof crashedSubagentTurns>;
  // During a Turn the crash joins the Turn's ending; otherwise the Feed shows it at once.
  turnEnding?: FeedTurnEnding;
  announce?: Extract<FeedEvent, { type: typeof turnEndingEvent }>;
};

const crashTitle = (failed: AcpFailed): string =>
  failed.error instanceof Error ? failed.error.message : String(failed.error);

const crashDescription = (failed: AcpFailed): string | undefined =>
  failed.error instanceof AgentProcessExitError
    ? failed.error.stderr || undefined
    : undefined;

const crashEnding = (
  context: SessionContext,
  failed: AcpFailed,
): CrashEnding => ({
  kind: 'agent_crash',
  occurredAt: context.input.now(),
  title: crashTitle(failed),
  description: crashDescription(failed),
});

export const recordCrash = (
  context: SessionContext,
  failed: AcpFailed,
  duringTurn: boolean,
): Crash => {
  const ending = crashEnding(context, failed);

  const subagents = crashedSubagentTurns(context.subagents, ending);

  if (duringTurn && context.activeTurnId)
    return { subagents, turnEnding: { ...context.turnEnding, ...ending } };

  return {
    subagents,
    announce: { type: turnEndingEvent, turnId: context.activeTurnId, ending },
  };
};
