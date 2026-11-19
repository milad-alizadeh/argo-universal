import type { Observer, Subscription } from 'xstate';

// Where a Prompt is: in a Turn, or waiting in the queue.
export type PromptPlace = { turnId: string } | { queuedId: string };

// What following a Prompt reads of its Session's context.
export type PromptSeen = {
  activeTurnId: string | null;
  pendingSubmission: { turnId: string } | null;
  queueSteering: { queuedId?: string; turnId: string } | null;
  dispatchingQueueId: string | null;
  promptQueue: { items: readonly { id: string }[] };
};

// The Session actor, as far as following a Prompt needs it.
export type FollowedSession = {
  getSnapshot: () => { context: PromptSeen };
  subscribe: (observer: Observer<unknown>) => Subscription;
};

// A Turn that is being admitted or runs.
const running = (context: PromptSeen, turnId: string): boolean =>
  context.activeTurnId === turnId ||
  context.pendingSubmission?.turnId === turnId;

const queued = (context: PromptSeen, queuedId: string): boolean =>
  context.promptQueue.items.some(({ id }) => id === queuedId);

const steeredTurn = (context: PromptSeen, queuedId: string): string | null =>
  context.queueSteering?.queuedId === queuedId
    ? context.queueSteering.turnId
    : null;

// A Turn started from the queue has the Prompt and the queue no longer does.
const startedWith = (
  context: PromptSeen,
  turnId: string,
  queuedId: string,
): boolean => running(context, turnId) && !queued(context, queuedId);

const dispatchTurn = (context: PromptSeen): string | null =>
  context.pendingSubmission?.turnId ?? null;

const turnOf = (place: PromptPlace): string | null =>
  'turnId' in place ? place.turnId : null;

const queuedOf = (place: PromptPlace): string =>
  'queuedId' in place ? place.queuedId : '';

/*
 * Follows one Prompt through its Session until the Turn that holds it ends. A queued Prompt is followed into the Turn
 * that takes it in, steered or started from the queue.
 */
class PromptTurn {
  public turnId: string | null;
  private readonly queuedId: string;
  // The Turn a queued Prompt is being dispatched to, before that Turn starts.
  private dispatchedTo: string | null = null;

  public constructor(place: PromptPlace) {
    this.turnId = turnOf(place);
    this.queuedId = queuedOf(place);
  }

  // The Turn id once the Prompt's Turn ended, null once it left the queue without one, undefined while it waits or runs.
  public look(context: PromptSeen): string | null | undefined {
    this.follow(context);

    return this.turnId === null
      ? this.waiting(context)
      : this.ran(context, this.turnId);
  }

  private waiting(context: PromptSeen): null | undefined {
    return queued(context, this.queuedId) ? undefined : null;
  }

  private ran(context: PromptSeen, turnId: string): string | undefined {
    return running(context, turnId) ? undefined : turnId;
  }

  private follow(context: PromptSeen): void {
    if (this.turnId !== null) return;
    this.noteDispatch(context);
    this.turnId =
      steeredTurn(context, this.queuedId) ?? this.startedTurn(context);
  }

  private noteDispatch(context: PromptSeen): void {
    if (context.dispatchingQueueId === this.queuedId)
      this.dispatchedTo = dispatchTurn(context);
  }

  private startedTurn(context: PromptSeen): string | null {
    const turnId = this.dispatchedTo;

    if (turnId === null) return null;

    return startedWith(context, turnId, this.queuedId) ? turnId : null;
  }
}

type Ended = PromiseWithResolvers<string | null>;

// Settles once a look at the Session finds the Prompt's Turn ended, or the Prompt gone.
const lookAt =
  (session: FollowedSession, prompt: PromptTurn, ended: Ended) => (): void => {
    const turnId = prompt.look(session.getSnapshot().context);

    if (turnId !== undefined) ended.resolve(turnId);
  };

function followSession(
  session: FollowedSession,
  prompt: PromptTurn,
  ended: Ended,
): void {
  const look = lookAt(session, prompt, ended);
  const closed = (): void => ended.resolve(prompt.turnId);
  const observer = { next: look, error: closed, complete: closed };
  const subscription = session.subscribe(observer);

  look();
  void ended.promise.then(() => subscription.unsubscribe());
}

/*
 * Settles with the Turn's id when the Turn that holds a Prompt ends. It settles with null when a queued Prompt leaves
 * the queue without a Turn, and with what it knows when the Session closes first. It never rejects.
 */
export function promptTurnEnded(
  session: FollowedSession,
  place: PromptPlace,
): Promise<string | null> {
  const ended = Promise.withResolvers<string | null>();

  followSession(session, new PromptTurn(place), ended);

  return ended.promise;
}
