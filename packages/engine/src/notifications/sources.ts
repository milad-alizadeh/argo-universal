import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { committedTurnEndings, type CommittedTurnEnding } from '../feed';
import { createSessionReader, type OpenSessionsActorRef } from '../sessions';
import type { WriterActorRef, WriterJob } from '../storage';
import type { NotificationFact } from './facts';
import { SessionInputNotifications } from './session-inputs';

export interface NotificationSources {
  database: Database;
  sessions: OpenSessionsActorRef;
  databaseWriter: WriterActorRef;
}

const titleOf = (title: string): string => title || 'Session';

type NotificationSession = ReturnType<ReturnType<typeof createSessionReader>>;

const excluded = (session: NotificationSession): boolean =>
  session.archivedAt !== null || session.parentSessionId !== null;

export class NotificationSourcesObserver {
  private readonly readSession: ReturnType<typeof createSessionReader>;
  private readonly inputs: SessionInputNotifications;

  public constructor(
    private readonly sources: NotificationSources,
    private readonly publish: (fact: NotificationFact) => void,
  ) {
    this.readSession = createSessionReader(sources.database);
    this.inputs = new SessionInputNotifications(
      sources.sessions,
      (sessionId, input) => this.emit({ ...input, sessionId, title: '' }),
    );
  }

  public start(): () => void {
    const stopInputs = this.inputs.start();

    const writer = this.sources.databaseWriter.on(
      'writer.committed',
      ({ jobs }) => this.committed(jobs),
    );

    return () => {
      stopInputs();
      writer.unsubscribe();
    };
  }

  private committed(jobs: readonly WriterJob[]): void {
    for (const ending of committedTurnEndings(jobs)) this.ending(ending);
  }

  private ending({ sessionId, turnId }: CommittedTurnEnding): void {
    this.emit({ sessionId, title: '', kind: 'turn_ended', turnId });
  }

  private emit(fact: NotificationFact): void {
    const session = this.metadata(fact.sessionId);

    if (!session) return;

    if (excluded(session)) return;
    this.publish({ ...fact, title: titleOf(session.title) });
  }

  private metadata(sessionId: string): NotificationSession | undefined {
    try {
      return this.readSession(sessionId);
    } catch (error) {
      if (error instanceof TRPCError) return this.unavailable(error);
      throw error;
    }
  }

  private unavailable(error: TRPCError): undefined {
    if (error.code === 'NOT_FOUND') return undefined;

    throw error;
  }
}
