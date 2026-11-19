import { describe, expect, it } from 'vitest';
import type { Observer, Subscription } from 'xstate';
import {
  promptTurnEnded,
  type FollowedSession,
  type PromptSeen,
} from './prompt-turn';

type Snapshot = ReturnType<FollowedSession['getSnapshot']>;

const idle = (): PromptSeen => ({
  activeTurnId: null,
  pendingSubmission: null,
  queueSteering: null,
  dispatchingQueueId: null,
  promptQueue: { items: [] },
});

// A Session the test moves from one context to the next, as its actor would.
class StubSession implements FollowedSession {
  private context: PromptSeen;
  private readonly observers = new Set<Observer<unknown>>();

  public constructor(context: Partial<PromptSeen>) {
    this.context = { ...idle(), ...context };
  }

  public readonly getSnapshot = (): Snapshot => ({ context: this.context });

  public readonly subscribe = (observer: Observer<unknown>): Subscription => {
    this.observers.add(observer);

    return {
      unsubscribe: (): void => {
        this.observers.delete(observer);
      },
    };
  };

  public get watched(): boolean {
    return this.observers.size > 0;
  }

  public change(context: Partial<PromptSeen>): void {
    this.context = { ...this.context, ...context };

    for (const observer of this.observers) observer.next?.(this.context);
  }

  public complete(): void {
    for (const observer of this.observers) observer.complete?.();
  }

  public fail(): void {
    for (const observer of this.observers)
      observer.error?.(new Error('The Session failed'));
  }
}

const queue = (...ids: string[]): PromptSeen['promptQueue'] => ({
  items: ids.map((id) => ({ id })),
});

// The queue picked a Prompt and is admitting the Turn it starts.
const dispatching = (
  queuedId: string,
  turnId: string,
): Partial<PromptSeen> => ({
  dispatchingQueueId: queuedId,
  pendingSubmission: { turnId },
});

const queuedBehind = (
  turnId: string,
  queuedId: string,
): Partial<PromptSeen> => ({
  activeTurnId: turnId,
  promptQueue: queue(queuedId),
});

const stillRunning = 'still running';

// What the Prompt's Turn settled with, or `stillRunning` while it has not ended.
const settled = (ended: Promise<string | null>): Promise<string | null> =>
  Promise.race([
    ended,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve(stillRunning), 0),
    ),
  ]);

describe('a Prompt in a Turn', () => {
  it('ends with its Turn, and not while the Turn runs', async () => {
    const session = new StubSession({ activeTurnId: 't1' });
    const ended = promptTurnEnded(session, { turnId: 't1' });

    session.change({ promptQueue: queue('other') });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ activeTurnId: null });
    expect(await ended).toBe('t1');
    expect(session.watched).toBe(false);
  });

  it('counts a Turn still being admitted as running', async () => {
    const session = new StubSession({ pendingSubmission: { turnId: 't1' } });
    const ended = promptTurnEnded(session, { turnId: 't1' });

    session.change({ activeTurnId: 't1' });
    session.change({ pendingSubmission: null });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ activeTurnId: 't2' });
    expect(await ended).toBe('t1');
  });
});

describe('a queued Prompt', () => {
  it('settles with no Turn when it leaves the queue without one', async () => {
    const session = new StubSession(queuedBehind('t0', 'q1'));
    const ended = promptTurnEnded(session, { queuedId: 'q1' });

    session.change({ activeTurnId: null });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ promptQueue: queue() });
    expect(await ended).toBeNull();
  });

  it('follows a steer into the running Turn and ends with it', async () => {
    const session = new StubSession(queuedBehind('t0', 'q1'));
    const ended = promptTurnEnded(session, { queuedId: 'q1' });

    session.change({ queueSteering: { queuedId: 'q1', turnId: 't0' } });
    session.change({ queueSteering: null, promptQueue: queue() });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ activeTurnId: null });
    expect(await ended).toBe('t0');
  });

  it('follows the Turn the queue starts for it and ends with it', async () => {
    const session = new StubSession({ promptQueue: queue('q1') });
    const ended = promptTurnEnded(session, { queuedId: 'q1' });

    session.change(dispatching('q1', 't1'));
    expect(await settled(ended)).toBe(stillRunning);

    session.change({
      activeTurnId: 't1',
      dispatchingQueueId: null,
      promptQueue: queue(),
    });
    session.change({ pendingSubmission: null });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ activeTurnId: null });
    expect(await ended).toBe('t1');
  });

  it('keeps waiting when a dispatch is abandoned and it stays queued', async () => {
    const session = new StubSession({ promptQueue: queue('q1') });
    const ended = promptTurnEnded(session, { queuedId: 'q1' });

    session.change(dispatching('q1', 't1'));
    session.change({ dispatchingQueueId: null, pendingSubmission: null });
    expect(await settled(ended)).toBe(stillRunning);

    session.change({ promptQueue: queue() });
    expect(await ended).toBeNull();
  });
});

describe('a Session that closes first', () => {
  it('settles with the Turn it knew when the Session completes', async () => {
    const session = new StubSession({ activeTurnId: 't1' });
    const ended = promptTurnEnded(session, { turnId: 't1' });

    session.complete();
    expect(await ended).toBe('t1');
  });

  it('settles, and never rejects, when the Session fails', async () => {
    const session = new StubSession({ promptQueue: queue('q1') });
    const ended = promptTurnEnded(session, { queuedId: 'q1' });

    session.fail();
    await expect(ended).resolves.toBeNull();
  });
});
