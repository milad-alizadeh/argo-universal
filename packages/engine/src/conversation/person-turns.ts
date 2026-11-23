// One of the person's transcripts, as the provider reports it.
export type PersonWords = { id: string; text: string; final: boolean };

type Waiter = (text: string) => void;

function settle(
  finals: Map<string, string>,
  waiters: Map<string, Waiter[]>,
  { id, text }: Pick<PersonWords, 'id' | 'text'>,
): void {
  finals.set(id, text);

  for (const waiter of waiters.get(id) ?? []) waiter(text);
  waiters.delete(id);
}

/*
 * The person's spoken turns, as the relay hears them, so a spoken answer counts only when the person said it after the
 * voice announced the request (ADR-0064). A turn counts once its first words arrive after the latest announcement;
 * its final words often arrive just after the voice hands it over, so the relay waits a moment for them.
 */
export class PersonTurns {
  private readonly seen = new Set<string>();
  private readonly sinceAnnouncement = new Set<string>();
  private readonly finals = new Map<string, string>();
  private readonly waiters = new Map<string, Waiter[]>();
  private readonly completed = new Map<string, string>();
  private readonly completionWaiters = new Map<string, Waiter[]>();

  // A Permission request was announced: every turn heard so far came before it.
  public announced(): void {
    this.sinceAnnouncement.clear();
  }

  public heard({ id, text, final }: PersonWords): void {
    if (!this.seen.has(id)) this.sinceAnnouncement.add(id);
    this.seen.add(id);

    if (final) settle(this.finals, this.waiters, { id, text });
  }

  public completedTurn(id: string, text: string): void {
    settle(this.completed, this.completionWaiters, { id, text });
  }

  // A turn can have an early Feed row before the provider reports the complete utterance.
  public async workText(id: string, waitMs: number): Promise<string | null> {
    const text =
      this.completed.get(id) ??
      (await this.nextFinal(this.completionWaiters, id, waitMs));

    return text ?? this.finals.get(id) ?? null;
  }

  // The final words of the person's turn `id` said since the latest announcement; null when it came before, or its final words do not arrive within `waitMs`.
  public async finalSince(id: string, waitMs: number): Promise<string | null> {
    if (this.cameBefore(id)) return null;
    const text = await this.finalOf(id, waitMs);

    return this.sinceAnnouncement.has(id) ? text : null;
  }

  private cameBefore(id: string): boolean {
    return this.seen.has(id) && !this.sinceAnnouncement.has(id);
  }

  private finalOf(id: string, waitMs: number): Promise<string | null> {
    const known = this.finals.get(id);

    return known === undefined
      ? this.nextFinal(this.waiters, id, waitMs)
      : Promise.resolve(known);
  }

  private nextFinal(
    waiters: Map<string, Waiter[]>,
    id: string,
    waitMs: number,
  ): Promise<string | null> {
    const { promise, resolve } = Promise.withResolvers<string | null>();

    const waiter = (text: string): void => {
      clearTimeout(timer);
      resolve(text);
    };

    const waiting = [...(waiters.get(id) ?? []), waiter];

    const timer = setTimeout(() => {
      const remaining = (waiters.get(id) ?? []).filter(
        (item) => item !== waiter,
      );

      if (remaining.length) waiters.set(id, remaining);
      else waiters.delete(id);

      resolve(null);
    }, waitMs);

    waiters.set(id, waiting);

    return promise;
  }
}
