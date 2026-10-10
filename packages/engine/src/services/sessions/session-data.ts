import {
  InitialConfigOption,
  type SessionNewInput,
  SessionRecord,
  TurnError,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { type Checkout, createCheckout, discardCheckout } from '@repo/git';
import { and, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { WriterActorRef } from '../../storage';
import { readQueuedFeed, titleFromPrompt } from '../feed';
import { decodeStoredSession, storedSessionColumns } from './session-record';
import { readQueuedSessionRows, SessionInsertJob } from './session-storage';

// Prompted creation carries the first Turn's id.
export type SessionCreationInput = SessionNewInput & {
  projectPath: string;
  turnId: string;
};

export type SessionInput = {
  database: Database;
  runtimeDirectory: string;
  sessionId: string;
} & (({ kind: 'new' } & SessionCreationInput) | { kind: 'existing' });
export type NewSessionInput = Extract<SessionInput, { kind: 'new' }>;
export interface SessionData {
  sessionId: string;
  projectId: string;
  agent: string;
  vendorSessionId: string | null;
  checkout: Checkout;
  // The values the Agent connects with: the `session.new` choices, then whatever the Agent last reported.
  configValues: InitialConfigOption[];
  epoch: number;
  maxRevision: number;
  activityAt: number;
  nextPosition: number;
  // The latest Turn, when it was interrupted and its Feed does not yet say output may be missing.
  undisclosedInterruptedTurnId: string | null;
}

export const interruptionDisclosureId = (turnId: string): string =>
  `${turnId}:interrupted`;

// The Session row waits until its Agent is ready.
export async function createSessionCheckout(
  input: NewSessionInput,
  signal?: AbortSignal,
): Promise<SessionData> {
  const checkout = await createCheckout(
    {
      projectPath: input.projectPath,
      projectId: input.projectId,
      sessionId: input.sessionId,
      choice: input.checkout,
      runtimeDirectory: input.runtimeDirectory,
    },
    signal,
  );
  return {
    sessionId: input.sessionId,
    projectId: input.projectId,
    agent: input.agent,
    vendorSessionId: null,
    checkout,
    configValues: input.configOptions,
    epoch: 0,
    maxRevision: 0,
    activityAt: Date.now(),
    nextPosition: 0,
    undisclosedInterruptedTurnId: null,
  };
}

export { titleFromPrompt } from '../feed';

// The writer job that stores the Session and remembers its checkout choice on the Project.
export function toSessionInsert(
  input: NewSessionInput,
  data: SessionData,
): SessionInsertJob {
  return new SessionInsertJob({
    session: {
      id: data.sessionId,
      projectId: data.projectId,
      agent: data.agent,
      title: titleFromPrompt(input.prompt),
      titleSource: 'prompt',
      vendorSessionId: data.vendorSessionId,
      checkoutPath: data.checkout.path,
      checkoutBranch: data.checkout.branch,
      configValues: data.configValues,
      projectionVersion: 1,
      activityAt: data.activityAt,
    },
    checkoutChoice: input.checkout,
  });
}

// Removes the worktree of a Session that never started; the main checkout stays.
export async function discardSessionCheckout(
  input: NewSessionInput,
  checkout: Checkout,
  signal?: AbortSignal,
): Promise<void> {
  if (input.checkout.type === 'worktree')
    await discardCheckout(input.projectPath, checkout, signal);
}

const storedConfigValues = z.array(InitialConfigOption);

const readLatestTurn = (
  database: Database,
  sessionId: string,
): { id: string; error: unknown } | undefined =>
  database
    .select({ id: turn.id, error: turn.error })
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(desc(turn.startedAt))
    .limit(1)
    .get();
const hasFeedRow = (
  database: Database,
  sessionId: string,
  id: string,
): boolean =>
  database
    .select({ id: feedRow.id })
    .from(feedRow)
    .where(and(eq(feedRow.sessionId, sessionId), eq(feedRow.id, id)))
    .get() !== undefined;
const readUndisclosedInterruption = (
  database: Database,
  sessionId: string,
): string | null => {
  const latest = readLatestTurn(database, sessionId);
  if (TurnError.safeParse(latest?.error).data?.code !== 'interrupted')
    return null;
  return latest &&
    !hasFeedRow(database, sessionId, interruptionDisclosureId(latest.id))
    ? latest.id
    : null;
};

export async function loadSession(
  input: SessionInput,
  writer?: WriterActorRef,
): Promise<SessionData> {
  const stored = input.database
    .select(storedSessionColumns)
    .from(session)
    .where(eq(session.id, input.sessionId))
    .get();
  const pending = readQueuedSessionRows(writer).session(
    stored && SessionRecord.parse(decodeStoredSession(stored)),
    input.sessionId,
  );
  if (!pending) throw new Error(`No Session ${input.sessionId}`);
  const row = pending;
  const pendingFeed = readQueuedFeed(writer, input.sessionId);
  const position = input.database
    .select({ highest: max(feedRow.position) })
    .from(feedRow)
    .where(eq(feedRow.sessionId, input.sessionId))
    .get()?.highest;
  return {
    sessionId: row.id,
    projectId: row.projectId,
    agent: row.agent,
    vendorSessionId: row.vendorSessionId,
    checkout: { path: row.checkoutPath, branch: row.checkoutBranch },
    configValues: storedConfigValues.parse(row.configValues),
    epoch: row.epoch,
    maxRevision: row.maxRevision,
    activityAt: row.activityAt,
    nextPosition: Math.max(position ?? -1, pendingFeed.highestPosition) + 1,
    undisclosedInterruptedTurnId: readUndisclosedInterruption(
      input.database,
      input.sessionId,
    ),
  };
}
