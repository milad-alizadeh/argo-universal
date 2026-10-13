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

const installationSource = (input: AppRouterInput): AgentInstallations =>
  input.installations ?? new AgentInstallations(input.home ?? '');

type AgentDependencies = Pick<
  AppRouterDeps,
  'createId' | 'agentLogins' | 'installations' | 'checkAgentLaunch'
>;

function createAgentDependencies(input: AppRouterInput): AgentDependencies {
  const createId = input.createId ?? randomUUID;
  const installations = installationSource(input);
  const agentLogins =
    input.agentLogins ??
    createEngineAgentLogins({
      sessions: input.sessions,
      createId,
      installations,
    });
  bindInstallations(installations, { ...input, createId, agentLogins });
  return { createId, installations, agentLogins, checkAgentLaunch };
}

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  return {
    ...input,
    ...sources,
    ...createAgentDependencies(input),
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

type InstallationSources = AppRouterInput &
  Pick<AppRouterDeps, 'agentLogins' | 'createId'>;

const isAgentInUse = (input: InstallationSources, agentId: string): boolean =>
  input.agentLogins.isBusy(agentId) ||
  Object.values(input.sessions.getSnapshot().context.sessions).some(
    (session) =>
      !session.getSnapshot().context.agent ||
      session.getSnapshot().context.agent === agentId,
  );

function bindInstallations(
  installations: AgentInstallations,
  input: InstallationSources,
): void {
  installations.bind({
    ...input,
    checkAgentLaunch,
    isInUse: (agentId) => isAgentInUse(input, agentId),
  });
}
