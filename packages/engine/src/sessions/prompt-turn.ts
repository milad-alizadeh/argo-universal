import type { Observer, Subscription } from 'xstate';
import type { TurnHappening } from './turn-happenings';

// Where a Prompt is: in a Turn, or waiting in the queue.
export type PromptPlace = { turnId: string } | { queuedId: string };

type Settle = (turnId: string | null) => void;

/*
 * The Session actor, as far as following a Prompt needs it: the Turn happenings it reports, and its queue, which says
 * whether a queued Prompt still waits.
 */
export type FollowedSession = {
  on: (type: '*', listener: (happening: TurnHappening) => void) => Subscription;
  getSnapshot: () => {
    context: { promptQueue: { items: readonly { id: string }[] } };
  };
  subscribe: (observer: Observer<unknown>) => Subscription;
};

const turnOf = (place: PromptPlace): string | null =>
  'turnId' in place ? place.turnId : null;

// One Prompt, followed from its place into the Turn that holds it, until that Turn ends.
class PromptTurn {
  public constructor(
    private place: PromptPlace,
    private readonly settle: Settle,
  ) {}

  public heard(happening: TurnHappening): void {
    if (happening.type === 'prompt.taken') this.taken(happening);
    else if (turnOf(this.place) === happening.turnId)
      this.settle(happening.turnId);
  }

  // A queued Prompt the queue no longer holds, and no Turn took, will never run.
  public looked(queued: readonly { id: string }[]): void {
    const { place } = this;

    if ('queuedId' in place && !queued.some(({ id }) => id === place.queuedId))
      this.settle(null);
  }

  public closed(): void {
    this.settle(turnOf(this.place));
  }

  private taken({
    queuedId,
    turnId,
  }: Extract<TurnHappening, { type: 'prompt.taken' }>): void {
    if ('queuedId' in this.place && this.place.queuedId === queuedId)
      this.place = { turnId };
  }
}

/*
 * Hears a Session's Turn happenings from the moment it is made, so a Prompt sent after it can be followed even when its
 * Turn moves on before anyone asks. Follow one Prompt with `ended`, or `stop` when none was sent.
 */
export class PromptWatch {
  private readonly heard: TurnHappening[] = [];
  private prompt: PromptTurn | null = null;
  private closed = false;
  private readonly happenings: Subscription;
  private readonly changes: Subscription;

  public constructor(private readonly session: FollowedSession) {
    this.happenings = session.on('*', (happening) => this.hear(happening));
    this.changes = session.subscribe({
      next: (): void => this.look(),
      error: (): void => this.close(),
      complete: (): void => this.close(),
    });
  }

  /*
   * Settles with the Turn's id when the Turn that holds the Prompt ends. It settles with null when a queued Prompt
   * leaves the queue without a Turn, and with what it knows when the Session closes first. It never rejects.
   */
  public ended(place: PromptPlace): Promise<string | null> {
    const ended = Promise.withResolvers<string | null>();
    const prompt = new PromptTurn(place, ended.resolve);

    this.prompt = prompt;
    void ended.promise.then(() => this.stop());

    for (const happening of this.heard) prompt.heard(happening);
    this.look();

    if (this.closed) prompt.closed();

    return ended.promise;
  }

  public stop(): void {
    this.happenings.unsubscribe();
    this.changes.unsubscribe();
  }

  private hear(happening: TurnHappening): void {
    if (this.prompt) this.prompt.heard(happening);
    else this.heard.push(happening);
  }

  private look(): void {
    this.prompt?.looked(this.session.getSnapshot().context.promptQueue.items);
  }

  private close(): void {
    this.closed = true;
    this.prompt?.closed();
  }
}
