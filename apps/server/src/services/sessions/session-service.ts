import { randomUUID } from 'node:crypto';
import type { SessionService } from '@repo/api';
import type { Database } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { notImplemented } from '../not-implemented';
import type { RegistryActorRef, RegistryCommand } from './registry-machine';
import { sendSessionCommand } from './session-command';
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
  return {
    list: notImplemented,
    listUpdates: notImplemented,
    counts: notImplemented,
    openSession: open,
    new: async (input) => {
      const sessionId = createId();
      send({ type: 'sessions.create', sessionId, ...input });
      const actor = await ready(sessionId);
      return {
        sessionId,
        configOptions: actor.getSnapshot().context.configOptions,
      };
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
