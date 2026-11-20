// One of the person's transcripts, as the provider reports it.
export type PersonWords = { id: string; text: string; final: boolean };

type Waiter = (text: string) => void;

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

  // A Permission request was announced: every turn heard so far came before it.
  public announced(): void {
    this.sinceAnnouncement.clear();
  }

  public heard({ id, text, final }: PersonWords): void {
    if (!this.seen.has(id)) this.sinceAnnouncement.add(id);
    this.seen.add(id);

    if (final) this.settled(id, text);
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
      ? this.nextFinal(id, waitMs)
      : Promise.resolve(known);
  }

  private settled(id: string, text: string): void {
    this.finals.set(id, text);

    for (const waiter of this.waiters.get(id) ?? []) waiter(text);
    this.waiters.delete(id);
  }

  private nextFinal(id: string, waitMs: number): Promise<string | null> {
    const { promise, resolve } = Promise.withResolvers<string | null>();
    const timer = setTimeout(() => resolve(null), waitMs);

    this.waiters.set(id, [
      ...(this.waiters.get(id) ?? []),
      (text): void => {
        clearTimeout(timer);
        resolve(text);
      },
    ]);

    return promise;
  }
}
