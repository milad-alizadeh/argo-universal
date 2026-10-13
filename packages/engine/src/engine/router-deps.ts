import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { checkAgentLaunch } from '../acp';
import { AgentInstallations, type AgentsRouterDeps } from '../agents';
import type { BlobUploadDeps } from '../blob';
import type { FeedDeps } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import {
  createSessionReader,
  createSessionSnapshotWatcher,
  type OpenSessionsActorRef,
  type SessionActorRef,
  type SessionRouterDeps,
  sessionActorId,
  sessionMachine,
} from '../sessions';
import { databaseWriterId, writerMachine } from '../storage';
import type { SystemDeps } from '../system';
import { createEngineAgentLogins } from './agent-logins';

export type AppRouterDeps = SessionRouterDeps &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps &
  FeedDeps;

type FeedSourcesInput = { database: Database; sessions: OpenSessionsActorRef };

type FeedSources = FeedSourcesInput &
  Pick<FeedDeps, 'findFeed' | 'findWriter'> & {
    findSession: (sessionId: string) => SessionActorRef | undefined;
  };

const findLiveSession =
  (sessions: OpenSessionsActorRef) =>
  (sessionId: string): SessionActorRef | undefined =>
    findMachineActor(
      sessions.system,
      sessionActorId(sessionId),
      sessionMachine,
    );

// Where the Feed finds the live Session, its feed actor and the Writer.
export function createFeedSources(input: FeedSourcesInput): FeedSources {
  const findSession = findLiveSession(input.sessions);
  return {
    ...input,
    findSession,
    findFeed: (sessionId) =>
      findSession(sessionId)?.getSnapshot().children.feed,
    findWriter: () =>
      findMachineActor(input.sessions.system, databaseWriterId, writerMachine),
  };
}

// The Engine supplies the ACP check to the Agents module itself.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'checkAgentLaunch'
  | 'agentLogins'
  | 'installations';
export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId' | 'agentLogins' | 'installations'>>;

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const installations =
    input.installations ?? new AgentInstallations(input.home ?? '');
  const agentLogins =
    input.agentLogins ??
    createEngineAgentLogins({
      sessions: input.sessions,
      createId: input.createId ?? randomUUID,
      installations,
    });
  bindInstallations(installations, { ...input, agentLogins });
  return {
    ...input,
    ...sources,
    createId: input.createId ?? randomUUID,
    checkAgentLaunch,
    agentLogins,
    installations,
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

function bindInstallations(
  installations: AgentInstallations,
  input: AppRouterInput & Pick<AppRouterDeps, 'agentLogins'>,
): void {
  installations.bind({
    ...input,
    createId: input.createId ?? randomUUID,
    checkAgentLaunch,
    isInUse: (agentId) =>
      input.agentLogins.isBusy(agentId) ||
      !!input.sessions
        .getSnapshot()
        .context.acpResources?.isAgentInUse(agentId) ||
      Object.values(input.sessions.getSnapshot().context.sessions).some(
        (session) =>
          !session.getSnapshot().context.agent ||
          session.getSnapshot().context.agent === agentId,
      ),
  });
}
