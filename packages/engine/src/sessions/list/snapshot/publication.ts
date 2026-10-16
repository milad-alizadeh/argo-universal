import type { Observer } from 'xstate';
import type { SessionActorRef } from '../../session-machine';
import type { SnapshotEvent, WatchOptions } from './observer';
import { SessionSnapshotReader } from './reader';

export class SnapshotPublication {
  private serialized = '';
  private sources: readonly unknown[] = [];
  private readonly reader: SessionSnapshotReader;
  public constructor(
    options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.reader = new SessionSnapshotReader(options);
  }

  public publish(
    session: SessionActorRef | undefined,
    feedSources: readonly unknown[],
  ): boolean {
    if (!this.sourcesChanged(sessionSources(session, feedSources)))
      return false;
    const result = this.reader.read(this.sessionId, session);
    const serialized = JSON.stringify(result.snapshot);

    if (serialized === this.serialized) return false;
    this.serialized = serialized;
    this.publishSnapshot(result.snapshot);

    return result.isClosed;
  }

  private publishSnapshot(
    snapshot: Extract<SnapshotEvent, { type: 'snapshot' }>['snapshot'],
  ): void {
    this.listener.next?.({ type: 'snapshot', snapshot });
  }

  private sourcesChanged(sources: readonly unknown[]): boolean {
    const changed = sources.some(
      (source, index): boolean => source !== this.sources[index],
    );

    this.sources = sources;

    return changed;
  }
}

function sessionSources(
  actor: SessionActorRef | undefined,
  feedSources: readonly unknown[],
): readonly unknown[] {
  const session = actor?.getSnapshot();

  return [actor, ...snapshotSources(session), ...feedSources];
}

function snapshotSources(
  session: ReturnType<SessionActorRef['getSnapshot']> | undefined,
): readonly unknown[] {
  return session
    ? [session.status, session.value, session.context]
    : [undefined, undefined, undefined];
}
