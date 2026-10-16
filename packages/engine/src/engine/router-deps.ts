import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import {
  createAgentChecker,
  checkAgentLaunch,
  type AcpResourceInput,
} from '../agents';
import { AgentInstallations, type AgentsRouterDeps } from '../agents';
import type { BlobUploadDeps } from '../blob';
import { type FeedDeps } from '../feed';
import { findMachineActor } from '../lib/machine-actor';
import type { PluginsDeps } from '../plugins';
import { findSessionFeed } from '../sessions';
import {
  createSessionConnections,
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

export type AppRouterDeps = SessionRouterDeps &
  AgentsRouterDeps &
  BlobUploadDeps &
  SystemDeps &
  FeedDeps &
  PluginsDeps;

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
    findFeed: (sessionId) => findSessionFeed(input.sessions.system, sessionId),
    findWriter: () =>
      findMachineActor(input.sessions.system, databaseWriterId, writerMachine),
  };
}

// The Engine supplies the ACP check to the Agents module itself.
type EngineSupplied =
  | keyof FeedDeps
  | 'createId'
  | 'checkAgentLaunch'
  | 'installations'
  | 'dropAgentConnections'
  | 'sessionConnections';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId' | 'installations'>> & {
    acp?: AcpResourceInput;
  };

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input);
  bindInstallations(setup.installations, { ...input, ...setup });

  return {
    ...input,
    ...sources,
    ...setup,
    checkAgentLaunch: createAgentChecker(input.acp?.launchProcess),
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

function bindInstallations(
  installations: AgentInstallations,
  input: AppRouterInput & Pick<AppRouterDeps, 'createId' | 'invalidateAgent'>,
): void {
  installations.bind({
    ...input,
    checkAgentLaunch,
    invalidateAgent: input.invalidateAgent,
    isInUse: (agentId) => sessionsUseAgent(input.sessions, agentId),
  });
}

type AgentSetup = Pick<
  AppRouterDeps,
  | 'installations'
  | 'createId'
  | 'invalidateAgent'
  | 'invalidateIdleAgents'
  | 'dropAgentConnections'
  | 'sessionConnections'
>;

function createAgentSetup(input: AppRouterInput): AgentSetup {
  const installations = input.installations ?? createInstallations(input.home);
  const sessionConnections = createSessionConnections(input.sessions);

  const { invalidateAgent, invalidateIdleAgents, dropAgentConnections } =
    sessionConnections.acpResources();

  return {
    installations,
    invalidateAgent,
    invalidateIdleAgents,
    dropAgentConnections,
    sessionConnections,
    createId: input.createId ?? randomUUID,
  };
}

function sessionsUseAgent(
  sessions: OpenSessionsActorRef,
  agentId: string,
): boolean {
  const { acpResources, sessions: open } = sessions.getSnapshot().context;

  return (
    !!acpResources?.isAgentInUse(agentId) ||
    Object.values(open).some((session) => {
      const { agent } = session.getSnapshot().context;

      return !agent || agent === agentId;
    })
  );
}

const createInstallations = (home = ''): AgentInstallations =>
  new AgentInstallations(home);
