import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentAdapter } from '@repo/agents';
import type { SessionNewInput } from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, project, session } from '@repo/db/schema';
import { type Checkout, createCheckout, removeCheckout } from '@repo/git';
import { eq, max } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
import type { ActorRefFrom } from 'xstate';
import { queuedFeedRows } from '../feed/feed-row';
import type { writerMachine } from '../feed/writer-machine';

export type SessionInput = {
  database: Database;
  // The Agent adapters to pick from; the registry by default.
  adapters?: readonly AgentAdapter[];
  runtimeDirectory?: string;
  sessionId: string;
} & (({ kind: 'new' } & SessionNewInput) | { kind: 'existing' });
export interface SessionData {
  sessionId: string;
  projectId: string;
  agent: string;
  vendorSessionId: string | null;
  checkout: Checkout;
  epoch: number;
  maxRevision: number;
  nextPosition: number;
}

export async function createSession(input: SessionInput): Promise<SessionData> {
  if (input.kind !== 'new') throw new Error('Expected a new Session');
  const storedProject = input.database
    .select()
    .from(project)
    .where(eq(project.id, input.projectId))
    .get();
  if (!storedProject) throw new Error(`No Project ${input.projectId}`);
  const checkout = await createCheckout({
    projectPath: createSelectSchema(project).parse(storedProject).path,
    projectId: input.projectId,
    sessionId: input.sessionId,
    choice: input.checkout,
    runtimeDirectory: input.runtimeDirectory ?? join(homedir(), '.argo'),
  });
  try {
    input.database
      .insert(session)
      .values({
        id: input.sessionId,
        projectId: input.projectId,
        agent: input.agent,
        checkoutPath: checkout.path,
        checkoutBranch: checkout.branch,
        projectionVersion: 1,
      })
      .run();
  } catch (error) {
    if (input.checkout === 'worktree')
      await removeCheckout(storedProject.path, checkout);
    throw error;
  }
  return loadSession(input);
}

export async function loadSession(
  input: SessionInput,
  writer?: ActorRefFrom<typeof writerMachine>,
): Promise<SessionData> {
  const stored = input.database
    .select()
    .from(session)
    .where(eq(session.id, input.sessionId))
    .get();
  if (!stored) throw new Error(`No Session ${input.sessionId}`);
  const pending = { ...stored };
  for (const job of writer?.getSnapshot().context.queue ?? [])
    if (job.type === 'sessionRowUpdate' && job.id === input.sessionId)
      Object.assign(pending, job.set);
  const row = createSelectSchema(session).parse(pending);
  const queued = queuedFeedRows(writer, input.sessionId);
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
    epoch: row.epoch,
    maxRevision: Math.max(
      row.maxRevision,
      ...queued.map((job) => job.maxRevision),
    ),
    nextPosition:
      Math.max(
        position ?? -1,
        ...queued.flatMap((job) => job.rows.map((row) => row.position)),
      ) + 1,
  };
}
