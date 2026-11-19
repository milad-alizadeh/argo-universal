import type { Observer, Subscription } from 'xstate';
import type { FollowedSession } from './prompt-turn';
import type { TurnHappening } from './turn-happenings';

type Snapshot = ReturnType<FollowedSession['getSnapshot']>;

type Queue = Snapshot['context']['promptQueue'];

export const queue = (...ids: string[]): Queue => ({
  items: ids.map((id) => ({ id })),
});

// A Session the test moves along, as its actor would: it reports Turn happenings and changes its queue.
export class StubSession implements FollowedSession {
  private promptQueue: Queue;
  private readonly observers = new Set<Observer<unknown>>();
  private readonly listeners = new Set<(happening: TurnHappening) => void>();

  public constructor(promptQueue: Queue = queue()) {
    this.promptQueue = promptQueue;
  }

  public readonly getSnapshot = (): Snapshot => ({
    context: { promptQueue: this.promptQueue },
  });

  public readonly subscribe = (observer: Observer<unknown>): Subscription => {
    this.observers.add(observer);

    return {
      unsubscribe: (): void => {
        this.observers.delete(observer);
      },
    };
  };

  public readonly on = (
    _type: '*',
    listener: (happening: TurnHappening) => void,
  ): Subscription => {
    this.listeners.add(listener);

    return {
      unsubscribe: (): void => {
        this.listeners.delete(listener);
      },
    };
  };

  public get watched(): boolean {
    return this.observers.size > 0 || this.listeners.size > 0;
  }

  // A happening is reported once the Session's state changed, before its observers hear the change.
  public report(happening: TurnHappening, promptQueue?: Queue): void {
    if (promptQueue) this.promptQueue = promptQueue;

    for (const listener of this.listeners) listener(happening);
    this.notify();
  }

  public changeQueue(promptQueue: Queue): void {
    this.promptQueue = promptQueue;
    this.notify();
  }

  public complete(): void {
    for (const observer of this.observers) observer.complete?.();
  }

  public fail(): void {
    for (const observer of this.observers)
      observer.error?.(new Error('The Session failed'));
  }

  private notify(): void {
    for (const observer of this.observers)
      observer.next?.(this.getSnapshot());
  }
}

export const ended = (turnId: string, stopReason = 'end_turn'): TurnHappening => ({
  type: 'turn.ended',
  turnId,
  stopReason,
  error: null,
});

export const taken = (queuedId: string, turnId: string): TurnHappening => ({
  type: 'prompt.taken',
  queuedId,
  turnId,
});
