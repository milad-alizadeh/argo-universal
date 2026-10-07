import {
  InitialConfigOption,
  type SessionNewInput,
  SessionRecord,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, project, session } from '@repo/db/schema';
import { type Checkout, createCheckout, discardCheckout } from '@repo/git';
import { eq, max } from 'drizzle-orm';
import { createSelectSchema } from 'drizzle-orm/zod';
import type { ActorRefFrom } from 'xstate';
import { z } from 'zod';
import {
  applyQueuedSession,
  queuedFeedRows,
  type WriterJob,
} from '../feed/writer-job';
import type { writerMachine } from '../feed/writer-machine';

// The first Turn's id travels with the creation, so the Session prompts as soon as it is stored.
export type SessionCreationInput = SessionNewInput & { turnId: string };

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
}

const readProjectPath = (input: NewSessionInput) => {
  const stored = input.database
    .select()
    .from(project)
    .where(eq(project.id, input.projectId))
    .get();
  if (!stored) throw new Error(`No Project ${input.projectId}`);
  return createSelectSchema(project).parse(stored).path;
};

// Creates the Checkout only; the Session row waits until its Agent is ready, so no empty Session exists.
export async function createSessionCheckout(
  input: NewSessionInput,
  signal?: AbortSignal,
): Promise<SessionData> {
  const checkout = await createCheckout(
    {
      projectPath: readProjectPath(input),
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
  };
}

// The first line of the prompt's text, which titles the Session until the Agent names it.
export function titleFromPrompt(prompt: SessionNewInput['prompt']): string {
  return (
    prompt
      .flatMap((block) => (block.type === 'text' ? block.text.split('\n') : []))
      .map((line) => line.trim())
      .find(Boolean) ?? ''
  );
}

// The writer job that stores the Session and remembers its checkout choice on the Project.
export function toSessionInsert(
  input: NewSessionInput,
  data: SessionData,
): Extract<WriterJob, { type: 'sessionInsert' }> {
  return {
    type: 'sessionInsert',
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
  };
}

// Removes the worktree of a Session that never started; the main checkout stays.
export async function discardSessionCheckout(
  input: NewSessionInput,
  checkout: Checkout,
  signal?: AbortSignal,
) {
  if (input.checkout.type === 'worktree')
    await discardCheckout(readProjectPath(input), checkout, signal);
}

const storedConfigValues = z.array(InitialConfigOption);

export async function loadSession(
  input: SessionInput,
  writer?: ActorRefFrom<typeof writerMachine>,
): Promise<SessionData> {
  const stored = input.database
    .select()
    .from(session)
    .where(eq(session.id, input.sessionId))
    .get();
  const jobs = writer?.getSnapshot().context.queue ?? [];
  const pending = applyQueuedSession({
    row: stored,
    sessionId: input.sessionId,
    jobs,
  });
  if (!pending) throw new Error(`No Session ${input.sessionId}`);
  const row = SessionRecord.parse(pending);
  const queued = queuedFeedRows(jobs, input.sessionId);
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
    nextPosition:
      Math.max(
        position ?? -1,
        ...queued.flatMap((job) => job.rows.map((row) => row.position)),
      ) + 1,
  };
}
