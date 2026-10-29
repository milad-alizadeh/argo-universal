import {
  InitialConfigOption,
  type SessionNewInput,
  TurnError,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, turn } from '@repo/db/schema';
import {
  type Checkout,
  createCheckout,
  discardCheckout,
  isSessionBranch,
} from '@repo/git';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  highestFeedPosition,
  interruptionDisclosureId,
  readQueuedFeed,
  titleFromPrompt,
} from '../feed';
import { readProjectPath } from '../projects';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../storage';
import { readSessionRow } from './session-record';
import { SessionDeleteJob, SessionInsertJob } from './session-storage';

// Prompted creation carries the first Turn's id.
export type SessionCreationInput = SessionNewInput & {
  projectPath: string;
  turnId: string;
  startedBySessionId?: string;
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
  heldConfig: InitialConfigOption[];
  epoch: number;
  maxRevision: number;
  activityAt: number;
  nextPosition: number;
  // Whether closing keeps the Session; a New Session no prompt reached is discarded instead.
  kept: boolean;
  // The latest Turn, when it was interrupted and its Feed does not yet say output may be missing.
  undisclosedInterruptedTurnId: string | null;
}

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
    heldConfig: [],
    epoch: 0,
    maxRevision: 0,
    activityAt: Date.now(),
    nextPosition: 0,
    kept: false,
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
      startedBySessionId: input.startedBySessionId ?? null,
      vendorSessionId: data.vendorSessionId,
      checkoutPath: data.checkout.path,
      checkoutBranch: data.checkout.branch,
      configValues: data.configValues,
      heldConfig: data.heldConfig,
      projectionVersion: 1,
      activityAt: data.activityAt,
    },
    checkoutChoice: input.checkout,
  });
}

export interface SessionDiscard {
  input: SessionInput;
  data: Pick<SessionData, 'sessionId' | 'projectId' | 'checkout'>;
  stored: boolean;
  writer: WriterActorRef | undefined;
}

// The Project path of a worktree the Session created; undefined for the main checkout.
const ownedWorktreeProject = ({
  input,
  data,
}: SessionDiscard): string | undefined => {
  if (input.kind === 'new')
    return input.checkout.type === 'worktree' ? input.projectPath : undefined;

  return isSessionBranch(data.checkout.branch, data.sessionId)
    ? readProjectPath(input.database, data.projectId)
    : undefined;
};

// Deletes the row of a Session no prompt reached, then removes the worktree it created; the main checkout stays.
export async function discardSession(
  discard: SessionDiscard,
  signal?: AbortSignal,
): Promise<void> {
  if (discard.stored) {
    if (!discard.writer) throw new Error('Database Writer is unavailable');
    await writeDatabaseJobAndWaitForCommit(
      discard.writer,
      new SessionDeleteJob(discard.data.sessionId),
    );
  }

  const projectPath = ownedWorktreeProject(discard);

  if (projectPath)
    await discardCheckout(projectPath, discard.data.checkout, signal);
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
  const row = readSessionRow(
    { database: input.database, writer },
    input.sessionId,
  );

  if (!row) throw new Error(`No Session ${input.sessionId}`);
  const pendingFeed = readQueuedFeed(writer, input.sessionId);

  const position = highestFeedPosition(input.database, input.sessionId);

  return {
    sessionId: row.id,
    projectId: row.projectId,
    agent: row.agent,
    vendorSessionId: row.vendorSessionId,
    checkout: { path: row.checkoutPath, branch: row.checkoutBranch },
    configValues: storedConfigValues.parse(row.configValues),
    heldConfig: storedConfigValues.parse(row.heldConfig),
    epoch: row.epoch,
    maxRevision: row.maxRevision,
    activityAt: row.activityAt,
    nextPosition: Math.max(position, pendingFeed.highestPosition) + 1,
    kept: true,
    undisclosedInterruptedTurnId: readUndisclosedInterruption(
      input.database,
      input.sessionId,
    ),
  };
}
