import { randomUUID } from 'node:crypto';
import type { SessionService } from '@repo/api';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { type ActorRefFrom, type SnapshotFrom, waitFor } from 'xstate';
import type { writerMachine } from '../feed/writer-machine';
import { notImplemented } from '../not-implemented';
import { readProjectPath } from '../projects/project-service';
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
  const findSessionActor = (sessionId: string) => {
    const actor = sessions.system.get(`session:${sessionId}`) as
      | SessionActorRef
      | undefined;
    if (!actor)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Session ${sessionId} did not open`,
      });
    return actor;
  };
  const ready = async (sessionId: string) => {
    const actor = findSessionActor(sessionId);
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
    if (!writer) return;
    const queued = (snapshot: SnapshotFrom<typeof writerMachine>) =>
      snapshot.context.queue.some(
        (job) => job.type === 'sessionInsert' && job.session.id === sessionId,
      );
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
    // Issues #57 and #58 implement the answer behavior after the contract slice.
    answerPermission: async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Permission answers are not implemented yet',
      });
    },
    answerElicitation: async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Elicitation answers are not implemented yet',
      });
    },
    answerPlanProposal: async () => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Plan proposal answers are not implemented yet',
      });
    },
    changes: notImplemented,
    diff: notImplemented,
    new: async (input) => {
      const projectPath = readProjectPath(database, input.projectId);
      if (
        input.checkout.type === 'worktree' &&
        !(await listBranches(projectPath)).branches.includes(
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
      const snapshot = await waitFor(
        findSessionActor(sessionId),
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
