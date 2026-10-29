import type { TurnEnd } from '@repo/contracts';
import type { FeedEvent } from '../../feed';
import type {
  EndTurnParameters,
  SessionContext,
  SessionWrite,
} from '../session-context';
import { TurnUpdateJob } from '../session-storage/session-storage';

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

type EndedTurn = {
  change: Pick<
    SessionContext,
    | 'activeTurnId'
    | 'activeTurnStartedAt'
    | 'permissionQueue'
    | 'hookedPermissions'
    | 'elicitationQueue'
    | 'storageFailedTurn'
  >;
  // The Feed commits the Turn's end with its last rows; once the Feed ended, the Turn's row is written directly.
  write?: SessionWrite;
  complete?: Extract<FeedEvent, { type: 'feed.completeTurn' }>;
};

const clearedTurn = (): EndedTurn['change'] => ({
  activeTurnId: null,
  activeTurnStartedAt: null,
  permissionQueue: [],
  hookedPermissions: {},
  elicitationQueue: [],
  storageFailedTurn: false,
});

const endParameters = (
  context: SessionContext,
  ended: EndTurnParameters,
): EndTurnParameters => (context.storageFailedTurn ? storageFailedTurn : ended);

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

type CompletionInput = {
  context: SessionContext;
  params: EndTurnParameters;
  endedAt: number;
  turnId: string;
  job: TurnUpdateJob;
};

const turnEnd = ({ context, params, endedAt }: CompletionInput): TurnEnd => ({
  stopReason: params.stopReason,
  error: params.error ?? null,
  durationMs: Math.max(0, endedAt - (context.activeTurnStartedAt ?? endedAt)),
});

const completion = (
  input: CompletionInput,
): NonNullable<EndedTurn['complete']> => ({
  type: 'feed.completeTurn',
  turnId: input.turnId,
  commitWith: input.job,
  ending: { kind: 'completion', turnEnd: turnEnd(input) },
});

type EndingState = Omit<CompletionInput, 'job'> & {
  change: EndedTurn['change'];
};

const finishTurn = (input: EndingState): EndedTurn => {
  const job = new TurnUpdateJob({
    id: input.turnId,
    set: endFields(input.params, input.endedAt),
  });

  if (input.context.feedEnded) return { change: input.change, write: { job } };

  return { change: input.change, complete: completion({ ...input, job }) };
};

const resolveEnd = (
  context: SessionContext,
  params: EndTurnParameters,
  endedAt: number,
): EndedTurn => {
  const change = clearedTurn();

  if (!context.activeTurnId) return { change };

  return finishTurn({
    context,
    params,
    endedAt,
    change,
    turnId: context.activeTurnId,
  });
};

export const endTurn = (
  context: SessionContext,
  ended: EndTurnParameters,
): EndedTurn => {
  return resolveEnd(
    context,
    endParameters(context, ended),
    context.input.now(),
  );
};
