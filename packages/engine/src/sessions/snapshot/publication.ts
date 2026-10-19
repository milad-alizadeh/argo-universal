import type { Observer } from 'xstate';
import type { SessionActorRef } from '../session-machine';
import type { SnapshotEvent, WatchOptions } from './observer';
import { SessionSnapshotReader } from './reader';
import type { FeedSources } from './snapshot-feed';

type PublishedSnapshot = Extract<
  SnapshotEvent,
  { type: 'snapshot' }
>['snapshot'];

export class SnapshotPublication {
  private serialized = '';
  private feed: FeedSources[0];
  private subagentIds: readonly string[] = [];
  private sources: readonly unknown[] = [];
  private readonly reader: SessionSnapshotReader;
  public constructor(
    options: WatchOptions,
    private readonly sessionId: string,
    private readonly listener: Observer<SnapshotEvent>,
  ) {
    this.reader = new SessionSnapshotReader(options);
  }

  // A new Feed actor is published even when the snapshot reads the same, so the stream reattaches to its batches.
  public publish(
    session: SessionActorRef | undefined,
    feedSources: FeedSources,
  ): boolean {
    const reattached = this.reattached(feedSources[0]);

    if (!this.sourcesChanged(sessionSources(session, feedSources)))
      return false;
    const result = this.reader.read(this.sessionId, session);

    if (!this.isNew(result.snapshot, reattached)) return false;
    this.publishSnapshot(result.snapshot);

    return result.isClosed;
  }

  private isNew(snapshot: PublishedSnapshot, reattached: boolean): boolean {
    const serialized = JSON.stringify(snapshot);

    if (serialized === this.serialized && !reattached) return false;
    this.serialized = serialized;

    return true;
  }

  public sessionIds(): readonly string[] {
    return [this.sessionId, ...this.subagentIds];
  }

  private publishSnapshot(snapshot: PublishedSnapshot): void {
    this.subagentIds = snapshot.subagents.map(
      (subagent): string => subagent.sessionId,
    );
    this.listener.next?.({ type: 'snapshot', snapshot });
  }

  private reattached(feed: FeedSources[0]): boolean {
    const changed = feed !== undefined && feed !== this.feed;

    this.feed = feed;

    return changed;
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
  feedSources: FeedSources,
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
