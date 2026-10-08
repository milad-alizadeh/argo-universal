import { randomUUID } from 'node:crypto';
import type { SessionService } from '@repo/api';
import { createElicitationAnswerSchema } from '@repo/contracts';
import type { Database } from '@repo/db';
import { listBranches } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { type ActorRefFrom, type SnapshotFrom, waitFor } from 'xstate';
import { userMessageId } from '../feed';
import type { writerMachine } from '../feed';
import { readProjectPath } from '../projects';
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
}: SessionServiceOptions): SessionService {
  const readSession = createSessionReader(database);
  const send = (command: RegistryCommand): void => {
    const snapshot = sessions.getSnapshot();
    if (!snapshot.can(command))
      throw new TRPCError({
        code: 'CONFLICT',
        message: `Session registry cannot accept ${command.type} in ${JSON.stringify(snapshot.value)}`,
      });
    sessions.send(command);
  };
  const findSessionActor = (sessionId: string): SessionActorRef => {
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
  const ready = async (sessionId: string): Promise<SessionActorRef> => {
    const actor = findSessionActor(sessionId);
    const snapshot = await waitFor(
      actor,
      (snapshot): boolean =>
        snapshot.status !== 'active' || isSessionReady(snapshot),
      { timeout: Infinity },
    );
    if (snapshot.status !== 'active')
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: snapshot.context.failure ?? `Session ${sessionId} closed`,
      });
    return actor;
  };
  const open = async (sessionId: string): Promise<SessionActorRef> => {
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
  const written = async (sessionId: string): Promise<void> => {
    const writer = sessions.system.get('databaseWriter') as
      | ActorRefFrom<typeof writerMachine>
      | undefined;
    if (!writer) return;
    const queued = (snapshot: SnapshotFrom<typeof writerMachine>): boolean =>
      snapshot.context.queue.some(
        (job): boolean =>
          job.type === 'sessionInsert' && job.session.id === sessionId,
      );
    const snapshot = await waitFor(
      writer,
      (snapshot): boolean =>
        snapshot.status !== 'active' ||
        !queued(snapshot) ||
        snapshot.matches('waitingToRetry'),
      { timeout: Infinity },
    );
    if (queued(snapshot))
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: snapshot.matches('waitingToRetry')
          ? `Session ${sessionId} was not stored because the writer is retrying. Retry the Session.`
          : `Session ${sessionId} was not stored`,
      });
  };
  return {
    ...createSessionList({ database, sessions }),
    answerPermission: async ({
      sessionId,
      toolCallId,
      optionId,
      message,
    }): Promise<Record<never, never>> => {
      const actor = await open(sessionId);
      const request = actor.getSnapshot().context.permissionQueue[0];
      if (request?.toolCallId !== toolCallId)
        throw new TRPCError({ code: 'CONFLICT', message: 'already answered' });
      if (
        !request.options.some((option): boolean => option.optionId === optionId)
      )
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The Agent did not offer that option',
        });
      if (
        optionId === 'reject_once' &&
        message &&
        actor.getSnapshot().context.capabilities?.permissionFeedback !== true
      )
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The Agent does not support Permission feedback',
        });
      sendSessionCommand(actor, {
        type: 'session.answerPermission',
        toolCallId,
        optionId,
        message,
      });
      return {};
    },
    answerElicitation: async ({
      sessionId,
      requestId,
      action,
      content,
    }): Promise<Record<never, never>> => {
      const actor = await open(sessionId);
      const request = actor.getSnapshot().context.pendingElicitation;
      if (request?.requestId !== requestId)
        throw new TRPCError({ code: 'CONFLICT', message: 'already answered' });
      if (action === 'accept') {
        const answer = createElicitationAnswerSchema(
          request.requestedSchema,
        ).safeParse(content ?? {});
        if (!answer.success)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'The answer does not match the Elicitation form',
            cause: answer.error,
          });
      }
      sendSessionCommand(actor, {
        type: 'session.answerElicitation',
        action,
        content,
      });
      return {};
    },
    answerPlanProposal: async (): Promise<never> => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Plan proposal answers are not implemented yet',
      });
    },
    changes: notImplemented,
    diff: notImplemented,
    new: async (input): ReturnType<SessionService['new']> => {
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
        projectPath,
      });
      const snapshot = await waitFor(
        findSessionActor(sessionId),
        (snapshot): boolean =>
          snapshot.status !== 'active' || snapshot.context.stored,
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
    prompt: async ({
      sessionId,
      prompt,
    }): ReturnType<SessionService['prompt']> => {
      const actor = await open(sessionId);
      const turnId = createId();
      sendSessionCommand(actor, {
        type: 'session.prompt',
        turnId,
        content: prompt,
      });
      return { messageId: userMessageId(turnId) };
    },
    // Title persistence and Agent commands are issue #66.
    rename: async (): Promise<never> => {
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Session rename is not implemented yet',
      });
    },
    cancel: async ({ sessionId }): Promise<Record<never, never>> => {
      sendSessionCommand(await open(sessionId), { type: 'session.cancel' });
      return {};
    },
    setConfigOption: async ({
      sessionId,
      configId,
      value,
    }): Promise<import('@repo/contracts').SessionSetConfigOptionOutput> => {
      const actor = await open(sessionId);
      const previous = actor.getSnapshot().context.configOptions;
      const option = previous.find(
        (option): boolean => option.configId === configId,
      );
      const allowed =
        option?.type === 'boolean'
          ? typeof value === 'boolean'
          : option?.options
              .flatMap(
                (
                  choice,
                ): import('@repo/contracts').SessionConfigSelectOption[] =>
                  'groupId' in choice ? choice.options : [choice],
              )
              .some((choice): boolean => choice.value === value);
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

// Contract procedures become operational in issue #74.
function notImplemented(): never {
  throw new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message: 'This procedure is not implemented yet',
  });
}
