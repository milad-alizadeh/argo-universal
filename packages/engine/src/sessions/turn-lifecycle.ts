import type { ContentBlock } from '@repo/contracts';
import { AgentProcessExitError } from '../agents';
import { turnEndingEvent, type FeedEvent, type FeedTurnEnding } from '../feed';
import type { AcpLifetimeEvent } from './acp/acp-lifetime';
import { currentModel } from './configuration/config-choices';
import type {
  EndTurnParameters,
  SessionContext,
  SessionWrite,
} from './session-context';
import { TurnInsertJob, TurnUpdateJob } from './session-storage';
import { crashedSubagentTurns } from './subagents';

export type StartTurnParameters = { turnId: string; content: ContentBlock[] };

type AcpFailed = Extract<AcpLifetimeEvent, { type: 'acp.failed' }>;

type CrashEnding = Extract<FeedTurnEnding, { kind: 'agent_crash' }>;

const interruptedTurn = (message: string): EndTurnParameters => ({
  stopReason: 'error',
  error: { code: 'interrupted', message },
});

const storageFailedTurn = interruptedTurn(
  'Storage is failing, so the Turn was cancelled',
);

export const connectionLostDuringTurn = interruptedTurn(
  'The Agent connection failed during the Turn',
);

type StartedTurn = {
  change: Pick<
    SessionContext,
    'activeTurnId' | 'activeTurnStartedAt' | 'turnEnding' | 'kept'
  >;
  write: SessionWrite;
};

export const startTurn = (
  context: SessionContext,
  turnId: string,
): StartedTurn => {
  const startedAt = context.input.now();

  return {
    change: {
      activeTurnId: turnId,
      activeTurnStartedAt: startedAt,
      turnEnding: { kind: 'completion' },
      kept: true,
    },
    write: {
      job: new TurnInsertJob({
        turn: {
          id: turnId,
          sessionId: context.sessionId,
          startedAt,
          status: 'running',
          model: currentModel(context.configOptions),
        },
      }),
    },
  };
};

type EndedTurn = {
  change: Pick<
    SessionContext,
    | 'activeTurnId'
    | 'activeTurnStartedAt'
    | 'permissionQueue'
    | 'hookedPermissions'
    | 'permissionDenied'
    | 'elicitationQueue'
    | 'storageFailedTurn'
  >;
  // The Feed commits the Turn's end with its last rows; once the Feed ended, the Turn's row is written directly.
  write?: SessionWrite;
  complete?: Extract<FeedEvent, { type: 'feed.completeTurn' }>;
};

export const endTurn = (
  context: SessionContext,
  ended: EndTurnParameters,
): EndedTurn => {
  const params = context.storageFailedTurn ? storageFailedTurn : ended;
  const endedAt = context.input.now();

  const change: EndedTurn['change'] = {
    activeTurnId: null,
    activeTurnStartedAt: null,
    permissionQueue: [],
    hookedPermissions: {},
    permissionDenied: false,
    elicitationQueue: [],
    storageFailedTurn: false,
  };

  if (!context.activeTurnId) return { change };

  const job = new TurnUpdateJob({
    id: context.activeTurnId,
    set: {
      status: 'ended',
      stopReason: params.stopReason,
      endedAt,
      usage: params.usage ?? null,
      error: params.error ?? null,
    },
  });

  if (context.feedEnded) return { change, write: { job } };

  return {
    change,
    complete: {
      type: 'feed.completeTurn',
      turnId: context.activeTurnId,
      commitWith: job,
      ending: {
        kind: 'completion',
        turnEnd: {
          stopReason: params.stopReason,
          error: params.error ?? null,
          ...(params.permissionDenied && { permissionDenied: true as const }),
          durationMs: Math.max(
            0,
            endedAt - (context.activeTurnStartedAt ?? endedAt),
          ),
        },
      },
    },
  };
};

type Crash = {
  // Each Subagent Turn the crash cut short.
  subagents: ReturnType<typeof crashedSubagentTurns>;
  // During a Turn the crash joins the Turn's ending; otherwise the Feed shows it at once.
  turnEnding?: FeedTurnEnding;
  announce?: Extract<FeedEvent, { type: typeof turnEndingEvent }>;
};

export const recordCrash = (
  context: SessionContext,
  failed: AcpFailed,
  duringTurn: boolean,
): Crash => {
  const ending: CrashEnding = {
    kind: 'agent_crash',
    occurredAt: context.input.now(),
    title:
      failed.error instanceof Error
        ? failed.error.message
        : String(failed.error),
    description:
      failed.error instanceof AgentProcessExitError
        ? failed.error.stderr || undefined
        : undefined,
  };

  const subagents = crashedSubagentTurns(context.subagents, ending);

  if (duringTurn && context.activeTurnId)
    return { subagents, turnEnding: { ...context.turnEnding, ...ending } };

  return {
    subagents,
    announce: { type: turnEndingEvent, turnId: context.activeTurnId, ending },
  };
};
