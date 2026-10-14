import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import type { AcpResourceInput } from '../agents';
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
import { discoveryCacheId, discoveryCacheMachine } from '../sessions';
import { databaseWriterId, writerMachine } from '../storage';
import type { SystemDeps } from '../system';
import { createEngineAgentLogins } from './agent-logins';
import { wireAgentReadiness } from './agent-readiness';

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
  | 'installations'
  | 'readiness'
  | 'resolver'
  | 'afterAgentOpenFailure'
  | 'discovery';

export type AppRouterInput = Omit<AppRouterDeps, EngineSupplied> &
  FeedSourcesInput &
  Partial<Pick<AppRouterDeps, 'createId' | 'agentLogins' | 'installations'>> & {
    acp?: AcpResourceInput;
    now?: () => number;
  };

export function createAppRouterDeps(
  input: AppRouterInput,
  sources: FeedSources = createFeedSources(input),
): AppRouterDeps {
  const setup = createAgentSetup(input);

  return {
    ...input,
    ...sources,
    ...setup,
    ...wireReadiness(input, setup),
    readSession: createSessionReader(input.database),
    watchSessionSnapshot: createSessionSnapshotWatcher(sources),
  };
}

// A Session that fails to open saves its Agent's new status, so the picker drops it.
function wireReadiness(
  input: AppRouterInput,
  setup: Parameters<typeof wireAgentReadiness>[1],
): ReturnType<typeof wireAgentReadiness> &
  Pick<AppRouterDeps, 'afterAgentOpenFailure'> {
  const wired = wireAgentReadiness(input, setup);

  return { ...wired, afterAgentOpenFailure: wired.readiness.saveOpenFailure };
}

function createAgentSetup(
  input: AppRouterInput,
): Pick<
  AppRouterDeps,
  'installations' | 'agentLogins' | 'createId' | 'discovery'
> {
  const installations = input.installations ?? createInstallations(input.home);

  return {
    installations,
    discovery: requireDiscovery(input.sessions),
    agentLogins: resolveAgentLogins(input, installations),
    createId: input.createId ?? randomUUID,
  };
}

function resolveAgentLogins(
  input: AppRouterInput,
  installations: AgentInstallations,
): AppRouterDeps['agentLogins'] {
  return (
    input.agentLogins ??
    createEngineAgentLogins({
      sessions: input.sessions,
      createId: input.createId ?? randomUUID,
      installations,
    })
  );
}

function createInstallations(home: string | undefined): AgentInstallations {
  return new AgentInstallations(home ?? '');
}

function requireDiscovery(
  sessions: OpenSessionsActorRef,
): AppRouterDeps['discovery'] {
  const discovery = findMachineActor(
    sessions.system,
    discoveryCacheId,
    discoveryCacheMachine,
  );

  if (!discovery) throw new Error('Discovery is unavailable');

  return discovery;
}
