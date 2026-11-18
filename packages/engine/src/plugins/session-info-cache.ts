// How long a Session's branch is kept when its row has not changed: an Agent or a person may switch it outside Argo.
export const sessionInfoKeptMs = 30_000;

type Kept<Info> = { row: string; at: number; info: Promise<Info> };

/*
 * What `argo.sessions.get` answers, kept in core per Session (#2197). The Session's row is the cheap part and is
 * read every time; the answer built from it (the Checkout's current branch is a `git` run) is kept while the row is
 * unchanged, so a page drawn again, or every Slot of one draw, asks the Checkout once. Calls that arrive together
 * share the one run.
 */
export class SessionInfoCache<Row extends object, Info> {
  private readonly kept = new Map<string, Kept<Info>>();

  constructor(private readonly now: () => number = Date.now) {}

  // The answer for the row as it is now, or null when the Session has gone, which leaves nothing kept.
  read(
    sessionId: string,
    row: Row | undefined,
    build: (row: Row) => Promise<Info>,
  ): Promise<Info | null> {
    if (!row) {
      this.kept.delete(sessionId);

      return Promise.resolve(null);
    }

    return this.keptFor(sessionId, row) ?? this.keep(sessionId, row, build);
  }

  // The kept answer while the row is the one it was built from and still fresh.
  private keptFor(sessionId: string, row: Row): Promise<Info> | undefined {
    const kept = this.kept.get(sessionId);

    return kept && this.holds(kept, row) ? kept.info : undefined;
  }

  private holds(kept: Kept<Info>, row: Row): boolean {
    return (
      this.now() - kept.at < sessionInfoKeptMs &&
      kept.row === JSON.stringify(row)
    );
  }

  private keep(
    sessionId: string,
    row: Row,
    build: (row: Row) => Promise<Info>,
  ): Promise<Info> {
    const info = build(row);

    this.kept.set(sessionId, {
      row: JSON.stringify(row),
      at: this.now(),
      info,
    });

    return info;
  }
}
