import { AtomicWriterJob } from '../storage';
import { changePromptQueue, queueWrite } from './prompt-queue';
import type { SessionContext, SessionCommand } from './session-context';
import { sessionTurn, type EndTurnParameters, type TurnStep } from './turn';
import { turnStep } from './turn';

type QueueEvent = Extract<SessionCommand, { type: 'session.queue' }>;

export function queueCommandStep(
  context: SessionContext,
  event: QueueEvent,
): TurnStep {
  try {
    const change = applyQueueCommand(context, event);

    event.committed.promise.catch(() => {});

    return committedQueueStep(context, event, change);
  } catch (error) {
    event.committed.reject(error);

    return turnStep({});
  }
}

export function selectQueuedPrompt(
  context: SessionContext,
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

export function removeQueuedPrompt(context: SessionContext): TurnStep {
  const promptQueue = remainingQueue(context);

  return turnStep({
    change: { promptQueue, dispatchingQueueId: null, pendingSubmission: null },
    writes: [{ job: queueWrite(context.sessionId, promptQueue) }],
  });
}

function remainingQueue(
  context: SessionContext,
): SessionContext['promptQueue'] {
  return {
    ...context.promptQueue,
    items: context.promptQueue.items.filter(
      ({ id }) => id !== context.dispatchingQueueId,
    ),
  };
}

export function startQueuedTurn(
  context: SessionContext,
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
  context: SessionContext,
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

export function hasQueuedPrompt(context: SessionContext): boolean {
  return context.pendingSubmission === null && canDispatchQueue(context);
}

function canDispatchQueue(context: SessionContext): boolean {
  if (context.promptQueue.pauseReason !== null) return false;
  const first = context.promptQueue.items[0];

  return first !== undefined && !context.queueHolds[first.id];
}

function committedQueueStep(
  context: SessionContext,
  event: QueueEvent,
  change: ReturnType<typeof changePromptQueue>,
): TurnStep {
  return turnStep({
    change: { ...change, queueCommitted: event.committed.promise },
    writes: [
      {
        job: queueWrite(context.sessionId, change.promptQueue),
        committed: event.committed,
      },
    ],
  });
}

export function endQueuedTurn(
  context: SessionContext,
  ended: EndTurnParameters,
): TurnStep {
  const reason = context.activeTurnId ? endQueueReason(ended) : null;

  return withQueuePause(context, sessionTurn.end(context, ended), reason);
}

function applyQueueCommand(
  context: SessionContext,
  event: QueueEvent,
): ReturnType<typeof changePromptQueue> {
  return changePromptQueue(context, event.command, context.input.createId);
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
