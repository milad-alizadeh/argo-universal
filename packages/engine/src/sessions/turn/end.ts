import type { TurnEnd } from '@repo/contracts';
import type { FeedEvent } from '../../feed';
import type { SessionContext } from '../session-context';
import { TurnUpdateJob } from '../session-storage/session-storage';
import { turnStep, type EndTurnParameters, type TurnStep } from './values';

type EndingSession = Pick<
  SessionContext,
  'activeTurnId' | 'activeTurnStartedAt' | 'feedEnded' | 'storageFailedTurn'
> & { input: Pick<SessionContext['input'], 'now'> };

type CompleteTurn = Extract<FeedEvent, { type: 'feed.completeTurn' }>;

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

type ClearedTurn = Pick<
  SessionContext,
  | 'activeTurnId'
  | 'activeTurnStartedAt'
  | 'permissionQueue'
  | 'hookedPermissions'
  | 'elicitationQueue'
  | 'storageFailedTurn'
>;

const clearedTurn = (): ClearedTurn => ({
  activeTurnId: null,
  activeTurnStartedAt: null,
  permissionQueue: [],
  hookedPermissions: {},
  elicitationQueue: [],
  storageFailedTurn: false,
});

const endFields = (
  params: EndTurnParameters,
  endedAt: number,
): ConstructorParameters<typeof TurnUpdateJob>[0]['set'] => ({
  status: 'ended',
  stopReason: params.stopReason,
  endedAt,
  usage: params.usage ?? null,
  error: params.error ?? null,
});

type Ending = {
  context: EndingSession;
  params: EndTurnParameters;
  endedAt: number;
  turnId: string;
};

const turnEnd = ({ context, params, endedAt }: Ending): TurnEnd => ({
  stopReason: params.stopReason,
  error: params.error ?? null,
  durationMs: Math.max(0, endedAt - (context.activeTurnStartedAt ?? endedAt)),
});

const completion = (input: Ending, job: TurnUpdateJob): CompleteTurn => ({
  type: 'feed.completeTurn',
  turnId: input.turnId,
  commitWith: job,
  ending: { kind: 'completion', turnEnd: turnEnd(input) },
});

// The Feed commits the Turn's end with its last rows; once the Feed ended, the Turn's row is written directly.
const finishTurn = (input: Ending): Pick<TurnStep, 'writes' | 'feed'> => {
  const job = new TurnUpdateJob({
    id: input.turnId,
    set: endFields(input.params, input.endedAt),
  });

  return input.context.feedEnded
    ? { writes: [{ job }], feed: [] }
    : { writes: [], feed: [completion(input, job)] };
};

// A Turn that was cancelled because storage failed is interrupted, whatever the Agent reported (ADR-0024).
const endParameters = (
  context: EndingSession,
  ended: EndTurnParameters,
): EndTurnParameters => (context.storageFailedTurn ? storageFailedTurn : ended);

// A Turn ends: the Session clears it, and its Stop reason, usage and error are stored.
export const endTurn = (
  context: EndingSession,
  ended: EndTurnParameters,
): TurnStep => {
  const change = clearedTurn();

  const turnId = context.activeTurnId;

  if (!turnId) return turnStep({ change });

  const params = endParameters(context, ended);

  const endedAt = context.input.now();

  return turnStep({
    change,
    ...finishTurn({ context, params, endedAt, turnId }),
  });
};
