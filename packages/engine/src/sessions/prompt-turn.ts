import type { Observer, Subscription } from 'xstate';
import type { TurnHappening } from './turn-happenings';

// Where a Prompt is: in a Turn, or waiting in the queue.
export type PromptPlace = { turnId: string } | { queuedId: string };

/*
 * A followed Prompt: `started` settles true once a Turn holds it, or false when it leaves without one; `ended`
 * settles with the id of the Turn that held it once that Turn ends, or null when no Turn held it. Neither rejects.
 */
export type FollowedPrompt = {
  started: Promise<boolean>;
  ended: Promise<string | null>;
};

type Settles = {
  start: (started: boolean) => void;
  end: (turnId: string | null) => void;
};

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
    private readonly settles: Settles,
  ) {
    if ('turnId' in place) settles.start(true);
  }

  public heard(happening: TurnHappening): void {
    if (happening.type === 'prompt.taken') this.taken(happening);
    else if (turnOf(this.place) === happening.turnId)
      this.settle(happening.turnId);
  }

  // A Prompt that ends before a Turn took it never started.
  private settle(turnId: string | null): void {
    this.settles.start(false);
    this.settles.end(turnId);
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
    if (!('queuedId' in this.place) || this.place.queuedId !== queuedId) return;
    this.place = { turnId };
    this.settles.start(true);
  }
}

/*
 * Hears a Session's Turn happenings from the moment it is made, so a Prompt sent after it can be followed even when its
 * Turn moves on before anyone asks. Follow one Prompt with `follow`, or `stop` when none was sent.
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

  // Follows the Prompt at `place` into the Turn that holds it; a Session that closes first settles it with what is known.
  public follow(place: PromptPlace): FollowedPrompt {
    const started = Promise.withResolvers<boolean>();
    const ended = Promise.withResolvers<string | null>();

    const prompt = new PromptTurn(place, {
      start: started.resolve,
      end: ended.resolve,
    });

    this.prompt = prompt;
    void ended.promise.then(() => this.stop());
    this.catchUp(prompt);

    return { started: started.promise, ended: ended.promise };
  }

  private catchUp(prompt: PromptTurn): void {
    for (const happening of this.heard) prompt.heard(happening);
    this.look();

    if (this.closed) prompt.closed();
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
