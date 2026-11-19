import type { SessionContext } from './session-context';
import type { SessionActorRef } from './session-machine';

// Where a Prompt is: in a Turn, or waiting in the queue.
export type PromptPlace = { turnId: string } | { queuedId: string };

type Seen = Pick<
  SessionContext,
  | 'activeTurnId'
  | 'pendingSubmission'
  | 'queueSteering'
  | 'dispatchingQueueId'
  | 'promptQueue'
>;

// A Turn that is being admitted or runs.
const running = (context: Seen, turnId: string): boolean =>
  context.activeTurnId === turnId ||
  context.pendingSubmission?.turnId === turnId;

const queued = (context: Seen, queuedId: string): boolean =>
  context.promptQueue.items.some(({ id }) => id === queuedId);

const steeredTurn = (context: Seen, queuedId: string): string | null =>
  context.queueSteering?.queuedId === queuedId
    ? context.queueSteering.turnId
    : null;

// A Turn started from the queue has the Prompt and the queue no longer does.
const startedWith = (context: Seen, turnId: string, queuedId: string): boolean =>
  running(context, turnId) && !queued(context, queuedId);

const dispatchTurn = (context: Seen): string | null =>
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
  public look(context: Seen): string | null | undefined {
    this.follow(context);

    return this.turnId === null
      ? this.waiting(context)
      : this.ran(context, this.turnId);
  }

  private waiting(context: Seen): null | undefined {
    return queued(context, this.queuedId) ? undefined : null;
  }

  private ran(context: Seen, turnId: string): string | undefined {
    return running(context, turnId) ? undefined : turnId;
  }

  private follow(context: Seen): void {
    if (this.turnId !== null) return;
    this.noteDispatch(context);
    this.turnId =
      steeredTurn(context, this.queuedId) ?? this.startedTurn(context);
  }

  private noteDispatch(context: Seen): void {
    if (context.dispatchingQueueId === this.queuedId)
      this.dispatchedTo = dispatchTurn(context);
  }

  private startedTurn(context: Seen): string | null {
    const turnId = this.dispatchedTo;

    if (turnId === null) return null;

    return startedWith(context, turnId, this.queuedId) ? turnId : null;
  }
}

function followSession(
  session: SessionActorRef,
  prompt: PromptTurn,
  ended: PromiseWithResolvers<string | null>,
): void {
  const look = (): void => {
    const turnId = prompt.look(session.getSnapshot().context);

    if (turnId !== undefined) ended.resolve(turnId);
  };

  const closed = (): void => ended.resolve(prompt.turnId);
  const subscription = session.subscribe({ next: look, error: closed, complete: closed });

  look();
  void ended.promise.then(() => subscription.unsubscribe());
}

/*
 * Settles with the Turn's id when the Turn that holds a Prompt ends. It settles with null when a queued Prompt leaves
 * the queue without a Turn, and with what it knows when the Session closes first. It never rejects.
 */
export function promptTurnEnded(
  session: SessionActorRef,
  place: PromptPlace,
): Promise<string | null> {
  const ended = Promise.withResolvers<string | null>();

  followSession(session, new PromptTurn(place), ended);

  return ended.promise;
}
