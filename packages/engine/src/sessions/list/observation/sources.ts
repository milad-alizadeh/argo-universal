import type { Subscription } from 'xstate';
import type { FeedActorRef } from '../../../feed';
import type { SessionActorRef } from '../../session-machine';
import type { SessionListEvent, SessionListMachineInput } from './machine';
import { onWriterChange, type WriterChange } from './writer-changes';

export class SessionListSources {
  private readonly feeds = new Map<FeedActorRef, Subscription>();
  private readonly sessions = new Map<SessionActorRef, Subscription>();
  public constructor(
    private readonly input: SessionListMachineInput,
    private readonly send: (event: SessionListEvent) => void,
  ) {}

  public start(): () => void {
    const sessions = this.input.sessions.subscribe({
      next: (): void => this.connect(),
      error: (error): void => this.send({ type: 'list.failed', error }),
      complete: (): void => this.send({ type: 'list.stop' }),
    });

    const writer = this.watchWriter();
    this.connect();

    return (): void => {
      sessions.unsubscribe();
      this.unsubscribeWriter(writer);
      this.unsubscribeSources();
    };
  }

  private unsubscribeWriter(writer: Subscription | undefined): void {
    writer?.unsubscribe();
  }

  private unsubscribeSources(): void {
    for (const listener of this.feeds.values()) listener.unsubscribe();

    for (const listener of this.sessions.values()) listener.unsubscribe();
  }

  private watchWriter(): Subscription | undefined {
    return (
      this.input.writer &&
      onWriterChange(this.input.writer, (change): void =>
        this.writerChanged(change),
      )
    );
  }

  private writerChanged(change: WriterChange): void {
    try {
      const ids = this.input.sessionIdsForChanges(change);

      if (ids.length) this.refresh(ids);
    } catch (error) {
      this.send({ type: 'list.failed', error });
    }
  }

  private refresh(sessionIds: readonly string[]): void {
    queueMicrotask((): void => this.send({ type: 'list.refresh', sessionIds }));
  }

  private connect(): void {
    const current = new Set(
      Object.values(this.input.sessions.getSnapshot().context.sessions),
    );

    const feeds = new Set<FeedActorRef>();

    for (const actor of current) this.watchSession(actor, feeds);
    this.removeSessions(current);
    this.removeFeeds(feeds);
  }

  private watchSession(actor: SessionActorRef, feeds: Set<FeedActorRef>): void {
    const id = actor.getSnapshot().context.sessionId;

    if (!this.sessions.has(actor)) {
      this.sessions.set(
        actor,
        actor.subscribe({
          next: (): void => this.refresh([id]),
          error: (): void => this.refresh([id]),
        }),
      );
      this.refresh([id]);
    }

    const feed = actor.getSnapshot().children.feed;

    if (feed) this.watchFeed(feed, id, feeds);
  }

  private watchFeed(
    feed: FeedActorRef,
    id: string,
    feeds: Set<FeedActorRef>,
  ): void {
    feeds.add(feed);

    if (!this.feeds.has(feed))
      this.feeds.set(
        feed,
        feed.subscribe({
          next: (): void => this.refresh([id]),
          error: (): void => this.refresh([id]),
        }),
      );
  }

  private removeSessions(current: Set<SessionActorRef>): void {
    for (const [actor, listener] of this.sessions) {
      if (current.has(actor)) continue;
      listener.unsubscribe();
      this.sessions.delete(actor);
      this.refresh([actor.getSnapshot().context.sessionId]);
    }
  }

  private removeFeeds(current: Set<FeedActorRef>): void {
    for (const [feed, listener] of this.feeds) {
      if (current.has(feed)) continue;
      listener.unsubscribe();
      this.feeds.delete(feed);
    }
  }
}
