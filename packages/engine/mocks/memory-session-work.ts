import { TRPCError } from '@trpc/server';
import type { Observer, Subscription } from 'xstate';
import type {
  SessionWork,
  SessionWorkRead,
  SessionWorkSource,
} from '../src/sessions';

const key = ({ kind, sessionId, entityId }: SessionWork): string =>
  `${kind}:${sessionId}:${entityId}`;

const missing = (work: SessionWork): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No Session work ${key(work)}` });

// The in-memory adapter for the Session work source: the test sets each work's read, and every set is a change its Session's watchers see.
export class MemorySessionWork implements SessionWorkSource {
  private readonly reads = new Map<string, SessionWorkRead | Error>();
  private readonly watchers = new Map<string, Set<Observer<void>>>();
  public readonly read = (work: SessionWork): SessionWorkRead => {
    const found = this.reads.get(key(work));

    if (found instanceof Error) throw found;

    if (!found) throw missing(work);

    return found;
  };
  public readonly watch = (
    sessionId: string,
    listener: Observer<void>,
  ): Subscription => {
    const listeners = this.watchers.get(sessionId) ?? new Set();
    listeners.add(listener);
    this.watchers.set(sessionId, listeners);

    return { unsubscribe: () => listeners.delete(listener) };
  };
  // A read, or the error the next read throws.
  public set(work: SessionWork, read: SessionWorkRead | Error): void {
    this.reads.set(key(work), read);

    for (const listener of this.watchers.get(work.sessionId) ?? [])
      listener.next?.();
  }
  public watching(sessionId: string): number {
    return this.watchers.get(sessionId)?.size ?? 0;
  }
}
