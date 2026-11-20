import type { Subscription } from 'xstate';
import type { SessionHandlerSources } from './session-sources';
import { onWriterChange } from './writer-changes';

type OpenedSources = Pick<SessionHandlerSources, 'findWriter' | 'open'>;

// A Session that opened, and the Session that started it through an Operation, or null.
export type OpenedListener = (
  sessionId: string,
  startedBy: string | null,
) => void;

type Row = ReturnType<OpenedSources['open']['queued']>;

// The Session's row, from storage or from the Writer's queued jobs, once it can be read.
function rowOf(sources: OpenedSources, sessionId: string): Row | undefined {
  try {
    return sources.open.queued(sessionId);
  } catch {
    return undefined;
  }
}

/*
 * Hears each Session as it opens, those open now first, once its row can be read: a new Session opens before its row
 * is written, so it is heard when the Writer takes the row. One that closes and opens again is heard again.
 */
class OpenedSessions {
  private readonly open = new Set<string>();
  private readonly unwritten = new Set<string>();
  private readonly subscriptions: Subscription[];

  public constructor(
    private readonly sources: OpenedSources,
    private readonly listener: OpenedListener,
  ) {
    const writer = sources.findWriter();
    const writes = writer ? [onWriterChange(writer, () => this.written())] : [];

    this.subscriptions = [
      sources.open.subscribe({ next: () => this.opened() }),
      ...writes,
    ];
    this.opened();
  }

  public stop(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  private opened(): void {
    const now = new Set(this.sources.open.ids());
    this.forgetClosed(now);

    for (const id of now) this.openedOne(id);
  }

  private forgetClosed(now: ReadonlySet<string>): void {
    for (const id of this.open) {
      if (now.has(id)) continue;
      this.open.delete(id);
      this.unwritten.delete(id);
    }
  }

  private openedOne(sessionId: string): void {
    if (this.open.has(sessionId)) return;
    this.open.add(sessionId);
    this.offer(sessionId);
  }

  private written(): void {
    for (const sessionId of this.unwritten) this.offer(sessionId);
  }

  private offer(sessionId: string): void {
    const row = rowOf(this.sources, sessionId);

    if (!row) {
      this.unwritten.add(sessionId);

      return;
    }

    this.unwritten.delete(sessionId);
    this.listener(sessionId, row.startedBySessionId ?? null);
  }
}

// Hears each Session as it opens, with the Session that started it, once its row can be read, until the returned function is called.
export function watchOpenedSessions(
  sources: OpenedSources,
  listener: OpenedListener,
): () => void {
  const opened = new OpenedSessions(sources, listener);

  return (): void => opened.stop();
}
