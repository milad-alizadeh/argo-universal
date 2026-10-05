import { randomUUID } from 'node:crypto';
import type { SessionService } from '@repo/api';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { type ActorRefFrom, waitFor } from 'xstate';
import type { writerMachine } from '../feed/writer-machine';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import { sendSessionCommand } from './session-command';
import { createSessionList } from './session-list';
import type { SessionActorRef } from './session-machine';
import { createSessionReader } from './session-record';
import { isSessionReady } from './session-snapshot';

export interface SessionServiceOptions {
  database: Database;
  sessions: RegistryActorRef;
  createId?: () => string;
}

export function createSessionService({
  database,
  sessions,
  createId = randomUUID,
}: SessionServiceOptions): SessionService & {
  openSession: (sessionId: string) => Promise<SessionActorRef>;
} {
  const readSession = createSessionReader(database);
  const send = (command: RegistryCommand) => {
    const snapshot = sessions.getSnapshot();
    if (!snapshot.can(command))
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Session registry cannot accept ${command.type} in ${JSON.stringify(snapshot.value)}`,
      });
    sessions.send(command);
  };
  const ready = async (sessionId: string) => {
    const actor = sessions.system.get(`session:${sessionId}`) as
      | SessionActorRef
      | undefined;
    if (!actor)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Session ${sessionId} did not open`,
      });
    const snapshot = await waitFor(
      actor,
      (snapshot) => snapshot.status !== 'active' || isSessionReady(snapshot),
      { timeout: Infinity },
    );
    if (snapshot.status !== 'active')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: snapshot.context.failure ?? `Session ${sessionId} closed`,
      });
    return actor;
  };
  const open = async (sessionId: string) => {
    const row = readSession(sessionId);
    if (row.parentSessionId !== null)
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A Subagent is read-only',
      });
    send({
      type: 'sessions.open',
      sessionId,
      agent: row.agent,
    });
    return ready(sessionId);
  };
  // Resolves once the writer has committed the new Session's row, so every read finds it.
  const written = async (sessionId: string) => {
    const writer = sessions.system.get('databaseWriter') as
      | ActorRefFrom<typeof writerMachine>
      | undefined;
    const queued = (
      snapshot: ReturnType<NonNullable<typeof writer>['getSnapshot']>,
    ) =>
      snapshot.context.queue.some(
        (job) => job.type === 'sessionInsert' && job.session.id === sessionId,
      );
    if (!writer) return;
    const snapshot = await waitFor(
      writer,
      (snapshot) => snapshot.status !== 'active' || !queued(snapshot),
      { timeout: Infinity },
    );
    if (queued(snapshot))
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Session ${sessionId} was not stored`,
      });
  };
  return {
    ...createSessionList({ database, sessions }),
    openSession: open,
    new: async (input) => {
      const stored = database
        .select({ path: project.path })
        .from(project)
        .where(eq(project.id, input.projectId))
        .get();
      if (!stored)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No Project ${input.projectId}`,
        });
      if (
        input.checkout.type === 'worktree' &&
        !(await listBranches(stored.path)).branches.includes(
          input.checkout.baseBranch,
        )
      )
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `No local branch ${input.checkout.baseBranch}`,
        });
      const sessionId = createId();
      send({
        type: 'sessions.create',
        sessionId,
        turnId: createId(),
        ...input,
      });
      const actor = sessions.system.get(`session:${sessionId}`) as
        | SessionActorRef
        | undefined;
      if (!actor)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Session ${sessionId} did not open`,
        });
      const snapshot = await waitFor(
        actor,
        (snapshot) => snapshot.status !== 'active' || snapshot.context.stored,
        { timeout: Infinity },
      );
      if (!snapshot.context.stored)
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: snapshot.context.failure ?? `Session ${sessionId} closed`,
        });
      await written(sessionId);
      return { sessionId };
    },
    prompt: async ({ sessionId, prompt }) => {
      const actor = await open(sessionId);
      const turnId = createId();
      sendSessionCommand(actor, {
        type: 'session.prompt',
        turnId,
        content: prompt,
      });
      return { messageId: `${turnId}:user` };
    },
    cancel: async ({ sessionId }) => {
      sendSessionCommand(await open(sessionId), { type: 'session.cancel' });
      return {};
    },
    setConfigOption: async ({ sessionId, configId, value }) => {
      const actor = await open(sessionId);
      const previous = actor.getSnapshot().context.configOptions;
      const option = previous.find((option) => option.configId === configId);
      const allowed =
        option?.type === 'boolean'
          ? typeof value === 'boolean'
          : option?.options
              .flatMap((choice) =>
                'groupId' in choice ? choice.options : [choice],
              )
              .some((choice) => choice.value === value);
      if (!allowed)
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `The Agent did not offer ${configId}=${String(value)}`,
        });
      sendSessionCommand(actor, {
        type: 'session.setConfigOption',
        configId,
        value,
      });
      return { configOptions: actor.getSnapshot().context.configOptions };
    },
  };
}
