import {
  SessionArchiveInput,
  SessionArchiveOutput,
  SessionUnarchiveInput,
  SessionUnarchiveOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { waitFor } from 'xstate';
import { findMachineActor } from '../../lib/machine-actor';
import { publicProcedure, router, routerFactory } from '../../rpc';
import type { SessionRouterDeps } from '../router-deps';
import {
  sendSessionCommand,
  validateSessionCommandAdmission,
} from '../session-command';
import { type SessionActorRef, sessionMachine } from '../session-machine';
import {
  requireOpenSessionActor,
  sendCheckedOpenSessionsCommand,
} from '../session-opening';
import { sessionActorId } from '../session-system';

const findSession = (
  deps: SessionRouterDeps,
  id: string,
): SessionActorRef | undefined =>
  findMachineActor(deps.sessions.system, sessionActorId(id), sessionMachine);

function readArchivableSession(
  deps: SessionRouterDeps,
  sessionId: string,
): ReturnType<SessionRouterDeps['readSession']> {
  const record = deps.readSession(sessionId);

  if (record.parentSessionId !== null || record.archivedAt !== null)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Only an active top-level Session can be archived',
    });

  return record;
}

function openArchive(deps: SessionRouterDeps, sessionId: string): void {
  sendCheckedOpenSessionsCommand(deps.sessions, {
    type: 'sessions.archive',
    sessionId,
    agent: deps.readSession(sessionId).agent,
  });
}

function startArchive(
  deps: SessionRouterDeps,
  sessionId: string,
): SessionActorRef {
  readArchivableSession(deps, sessionId);

  const live = findSession(deps, sessionId);

  if (live) {
    sendSessionCommand(live, { type: 'session.archive' });

    return live;
  }

  openArchive(deps, sessionId);

  return requireOpenSessionActor(deps.sessions, sessionId);
}

function requireArchived(
  outcome: ReturnType<SessionActorRef['getSnapshot']>,
): void {
  if (!outcome.matches('archived'))
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure ?? 'Archive failed',
    });
}

async function archiveSession(
  deps: SessionRouterDeps,
  sessionId: string,
): Promise<SessionArchiveOutput> {
  validateSessionCommandAdmission(deps);
  const actor = startArchive(deps, sessionId);

  const outcome = await waitFor(
    actor,
    (snapshot) => snapshot.matches('archived') || snapshot.status !== 'active',
    { timeout: Infinity },
  );

  requireArchived(outcome);

  return {};
}

function startUndo(
  deps: SessionRouterDeps,
  sessionId: string,
): SessionActorRef {
  deps.readSession(sessionId);
  const actor = findSession(deps, sessionId);

  if (!actor)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Undo window has ended',
    });

  sendSessionCommand(actor, { type: 'session.unarchive' });

  return actor;
}

function requireUndoSucceeded(
  outcome: ReturnType<SessionActorRef['getSnapshot']>,
): void {
  if (outcome.context.failure)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: outcome.context.failure,
    });
}

async function unarchiveSession(
  deps: SessionRouterDeps,
  sessionId: string,
): Promise<SessionUnarchiveOutput> {
  validateSessionCommandAdmission(deps);
  const actor = startUndo(deps, sessionId);

  const outcome = await waitFor(
    actor,
    (snapshot) => snapshot.status !== 'active',
    { timeout: Infinity },
  );

  requireUndoSucceeded(outcome);

  return {};
}

export const createArchiveRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    archive: publicProcedure
      .input(SessionArchiveInput)
      .output(SessionArchiveOutput)
      .mutation(({ input }) => archiveSession(deps, input.sessionId)),
    unarchive: publicProcedure
      .input(SessionUnarchiveInput)
      .output(SessionUnarchiveOutput)
      .mutation(({ input }) => unarchiveSession(deps, input.sessionId)),
  }),
);
