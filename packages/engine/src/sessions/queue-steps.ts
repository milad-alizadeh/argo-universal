import { AtomicWriterJob } from '../storage';
import { queueWrite } from './prompt-queue';
import type { SessionContext } from './session-context';
import {
  sessionTurn,
  turnStep,
  type EndTurnParameters,
  type TurnStep,
} from './turn';

type QueueSelection = Pick<SessionContext, 'promptQueue'> & {
  input: Pick<SessionContext['input'], 'createId'>;
};

export function selectQueuedPrompt(
  context: QueueSelection,
): Partial<SessionContext> {
  const row = context.promptQueue.items[0];

  if (!row) return {};

  return {
    dispatchingQueueId: row.id,
    pendingSubmission: {
      turnId: context.input.createId(),
      content: row.prompt,
      sender: { type: 'user' },
    },
  };
}

export function removeQueuedPrompt(
  context: Pick<
    SessionContext,
    'sessionId' | 'promptQueue' | 'dispatchingQueueId'
  >,
): TurnStep {
  const promptQueue = remainingQueue(context);

  return turnStep({
    change: { promptQueue, dispatchingQueueId: null, pendingSubmission: null },
    writes: [{ job: queueWrite(context.sessionId, promptQueue) }],
  });
}

function remainingQueue(
  context: Pick<SessionContext, 'promptQueue' | 'dispatchingQueueId'>,
): SessionContext['promptQueue'] {
  return {
    ...context.promptQueue,
    items: context.promptQueue.items.filter(
      ({ id }) => id !== context.dispatchingQueueId,
    ),
  };
}

export function startQueuedTurn(
  context: Parameters<typeof sessionTurn.start>[0] &
    Pick<SessionContext, 'promptQueue' | 'dispatchingQueueId'>,
  turnId: string,
): TurnStep {
  const step = sessionTurn.start(context, turnId);

  if (!context.dispatchingQueueId) return step;
  const promptQueue = remainingQueue(context);

  return turnStep({
    ...step,
    change: { ...step.change, promptQueue, dispatchingQueueId: null },
    writes: atomicStart(step, context.sessionId, promptQueue),
  });
}

function atomicStart(
  step: TurnStep,
  sessionId: string,
  queue: SessionContext['promptQueue'],
): TurnStep['writes'] {
  return [
    {
      job: new AtomicWriterJob([
        ...step.writes.map(({ job }) => job),
        queueWrite(sessionId, queue),
      ]),
    },
  ];
}

export function withQueuePause(
  context: Pick<SessionContext, 'sessionId' | 'promptQueue'>,
  step: TurnStep,
  reason: string | null,
): TurnStep {
  if (!reason || !context.promptQueue.items.length) return step;
  const promptQueue = { ...context.promptQueue, pauseReason: reason };

  return pausedQueueStep(step, context.sessionId, promptQueue);
}

export function endQueueReason(ended: EndTurnParameters): string | null {
  if (ended.stopReason === 'end_turn') return null;

  return ended.stopReason === 'cancelled'
    ? 'Turn stopped'
    : 'Turn did not complete normally';
}

export function hasQueuedPrompt(
  context: Pick<
    SessionContext,
    'pendingSubmission' | 'promptQueue' | 'queueHolds'
  >,
): boolean {
  return context.pendingSubmission === null && canDispatchQueue(context);
}

function canDispatchQueue(
  context: Pick<SessionContext, 'promptQueue' | 'queueHolds'>,
): boolean {
  if (context.promptQueue.pauseReason !== null) return false;
  const first = context.promptQueue.items[0];

  return first !== undefined && !context.queueHolds[first.id];
}

export function endQueuedTurn(
  context: Parameters<typeof sessionTurn.end>[0] &
    Pick<SessionContext, 'sessionId' | 'promptQueue'>,
  ended: EndTurnParameters,
): TurnStep {
  const reason = context.activeTurnId ? endQueueReason(ended) : null;

  return withQueuePause(context, sessionTurn.end(context, ended), reason);
}

function pausedQueueStep(
  step: TurnStep,
  sessionId: string,
  promptQueue: SessionContext['promptQueue'],
): TurnStep {
  return {
    ...step,
    change: { ...step.change, promptQueue },
    writes: [...step.writes, { job: queueWrite(sessionId, promptQueue) }],
  };
}
