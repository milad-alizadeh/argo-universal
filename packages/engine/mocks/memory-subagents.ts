import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionUpdate } from '@repo/contracts';
import { feedRow, session as sessionRow } from '@repo/db/schema';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { and, asc, eq } from 'drizzle-orm';
import { onTestFinished } from 'vitest';
import { waitFor } from 'xstate';
import { hydrateStoredFeedRow, storedFeedColumns } from '../src/feed';
import {
  flushSubagents,
  noSubagents,
  ownsSubagentUpdate,
  routeSubagentUpdate,
  type SubagentSession,
  type Subagents,
} from '../src/sessions';
import type { WriterActorRef } from '../src/storage';
import { openTestDatabase } from './database';
import {
  parentFeedInput,
  sessionOf,
  startWriter,
} from './memory-subagent-feeds';

type Database = ReturnType<typeof openTestDatabase>['database'];

const parentId = 'session-1';

// A Session's Subagents with a real Writer and real Feeds over a test database. `route` hands them an ACP update and keeps the state they return; `withoutFeed` routes as a Session that has no Feed; `play` routes the updates of scripted steps the Session would hand them, as the Agent's ACP Session `acpSessionId`; `settled` flushes every Feed and waits for the Writer; `rows` reads the stored Feed of the parent, or of the Subagent the Agent names.
export type MemorySubagents = {
  database: Database;
  state: () => Subagents;
  route: (notification: SessionNotification) => void;
  withoutFeed: (notification: SessionNotification) => void;
  play: (steps: readonly ScriptedStep[]) => void;
  flush: () => void;
  settled: () => Promise<void>;
  parentId: string;
  childId: (vendorId: string) => string;
  rows: (vendorId?: string) => SessionUpdate[];
};

const childIdOf = (database: Database, vendorId: string): string => {
  const child = database
    .select({ id: sessionRow.id })
    .from(sessionRow)
    .where(
      and(
        eq(sessionRow.parentSessionId, parentId),
        eq(sessionRow.vendorSessionId, vendorId),
      ),
    )
    .get();

  if (!child) throw new Error(`No Subagent ${vendorId} was stored`);

  return child.id;
};

const storedRows = (database: Database, sessionId: string): SessionUpdate[] =>
  database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(eq(feedRow.sessionId, sessionId))
    .orderBy(asc(feedRow.position))
    .all()
    .map((row) => hydrateStoredFeedRow(sessionId, row));

// A scripted update with no session id arrives on the parent's own transcript.
const notificationOf = (
  step: Extract<ScriptedStep, { type: 'update' }>,
  acpSessionId: string,
): SessionNotification => ({
  sessionId: step.sessionId ?? acpSessionId,
  update: step.update,
});

export const openMemorySubagents = (
  acpSessionId = 'acp-session',
): MemorySubagents => new SubagentFixture(acpSessionId);

class SubagentFixture implements MemorySubagents {
  public readonly database: Database;
  public readonly parentId = parentId;
  private readonly writer: WriterActorRef;
  private readonly host: SubagentSession;
  private readonly withFeed: SubagentSession;
  private readonly parentFeed: ReturnType<SubagentSession['spawn']>;
  private subagents = noSubagents;

  public constructor(private readonly acpSessionId: string) {
    const { database, directory, remove } = openTestDatabase();
    onTestFinished(remove);
    this.database = database;
    this.writer = startWriter(database, directory);
    this.host = sessionOf(database, this.writer, acpSessionId);
    this.parentFeed = this.host.spawn(parentFeedInput(database, this.writer));
    this.withFeed = { ...this.host, parentFeed: this.parentFeed };
  }

  public readonly state = (): Subagents => this.subagents;

  public readonly route = (notification: SessionNotification): void => {
    this.subagents = routeSubagentUpdate(
      this.withFeed,
      this.subagents,
      notification,
    );
  };

  public readonly withoutFeed = (notification: SessionNotification): void => {
    routeSubagentUpdate(this.host, this.subagents, notification);
  };

  public readonly play = (steps: readonly ScriptedStep[]): void => {
    for (const step of steps) {
      if (step.type === 'update') this.playUpdate(step);
    }
  };

  private readonly playUpdate = (
    step: Extract<ScriptedStep, { type: 'update' }>,
  ): void => {
    const notification = notificationOf(step, this.acpSessionId);

    if (ownsSubagentUpdate(this.subagents, notification))
      this.route(notification);
  };

  public readonly flush = (): void => {
    flushSubagents(this.subagents);
    this.parentFeed.send({ type: 'feed.flush' });
  };

  public readonly settled = async (): Promise<void> => {
    this.flush();
    await waitFor(
      this.writer,
      (snapshot) =>
        snapshot.matches('idle') && snapshot.context.queue.length === 0,
    );
  };

  public readonly childId = (vendorId: string): string =>
    childIdOf(this.database, vendorId);

  public readonly rows = (vendorId?: string): SessionUpdate[] =>
    storedRows(
      this.database,
      vendorId === undefined ? parentId : this.childId(vendorId),
    );
}
