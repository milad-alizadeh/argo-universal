import { homedir } from 'node:os';
import type { AgentCheck } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import { cantStart } from '../acp/check-failure';
import type { CheckAgentLaunch } from '../agent-launch';
import {
  AgentReadinessSaveJob,
  pendingReadiness,
  type SavedReadiness,
} from '../agent-storage';
import { resolveInstalledAgentLaunch } from '../install/selection/launch';
import { readinessOfFailure } from './readiness-failure';
import { ReadinessSkipped } from './readiness-skipped';
import { checkableAgents, missingFiles, readTarget } from './readiness-target';
import { sanitizeReason } from './sanitize-reason';

export type ReadinessDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  home: string;
  now: () => number;
  checkAgentLaunch: CheckAgentLaunch;
  // The Resolver looks again before every check, so a check uses what is on the machine now.
  resolve: () => Promise<readonly string[]>;
  // Setup ownership: waits for an install or edit, shares a running check and keeps cleanup failures owned.
  withAgentCheck: (
    agentId: string,
    operation: (signal: AbortSignal) => Promise<AgentCheck>,
  ) => Promise<AgentCheck>;
};

const startConcurrency = 4;

// Runs inside setup ownership, so it reads the Agent as committed after any install or edit it waited for.
const runCheck = async (
  deps: ReadinessDeps,
  agentId: string,
  signal: AbortSignal,
): Promise<AgentCheck> => {
  const target = readTarget(deps.database, agentId);
  const missing = await missingFiles(deps.home, target);

  if (missing) return missing;

  const launch = await resolveInstalledAgentLaunch(
    deps.database,
    deps.home,
  )({ agent: agentId, projectId: '', projectPath: homedir() });

  return deps.checkAgentLaunch({ name: target.name, launch, signal });
};

const sanitized = ({ reason, ...check }: AgentCheck): AgentCheck =>
  reason === undefined ? check : { ...check, reason: sanitizeReason(reason) };

const save = (
  deps: ReadinessDeps,
  agentIds: readonly string[],
  readiness: SavedReadiness,
): Promise<void> =>
  writeDatabaseJobAndWaitForCommit(
    deps.databaseWriter,
    new AgentReadinessSaveJob(agentIds, readiness),
    true,
  );

const savedCheck = (
  deps: ReadinessDeps,
  check: AgentCheck,
): SavedReadiness => ({
  readinessStatus: check.status,
  readinessReason: check.reason ?? null,
  readinessCheckedAt: deps.now(),
});

const checkOrFailure = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  try {
    return await deps.withAgentCheck(agentId, (signal) =>
      runCheck(deps, agentId, signal),
    );
  } catch (error) {
    if (error instanceof ReadinessSkipped) throw error;

    return readinessOfFailure(error);
  }
};

const checkAndSave = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  const result = sanitized(await checkOrFailure(deps, agentId));
  await save(deps, [agentId], checkedReadiness(deps, result));

  return result;
};

// A finished check also replaces the agentInfo version; other saves keep it.
const checkedReadiness = (
  deps: ReadinessDeps,
  check: AgentCheck,
): SavedReadiness => ({
  ...savedCheck(deps, check),
  readinessAgentVersion: check.agentVersion ?? null,
});

// Shows the Agent as Checking… at once, then saves what the shared ACP check observed.
const recheckAgent = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  readTarget(deps.database, agentId);
  await save(deps, [agentId], pendingReadiness);
  await deps.resolve().catch(() => {});

  return checkAndSave(deps, agentId);
};

const runBounded = async (
  agentIds: readonly string[],
  check: (agentId: string) => Promise<AgentCheck>,
): Promise<void> => {
  const queue = [...agentIds];

  const worker = async (): Promise<void> => {
    for (let next = queue.shift(); next; next = queue.shift())
      await check(next).catch(() => {});
  };

  await Promise.all(Array.from({ length: startConcurrency }, worker));
};

// Every installed, enabled Agent is checked again, with any the Resolver just found; saved results are never trusted. Disabled Agents never run.
const recheckEveryAgent = async (deps: ReadinessDeps): Promise<void> => {
  const known = checkableAgents(deps.database);
  await save(deps, known, pendingReadiness);
  await deps.resolve().catch(() => {});
  const agentIds = checkableAgents(deps.database);
  const found = agentIds.filter((agentId) => !known.includes(agentId));
  await save(deps, found, pendingReadiness);
  await runBounded(agentIds, (agentId) => checkAndSave(deps, agentId));
};

// A saved Ready that failed to open a Session: saved as Can't start with what the Session observed.
export const saveOpenFailure = (
  deps: ReadinessDeps,
  agentId: string,
  reason: string,
): Promise<void> =>
  save(deps, [agentId], savedCheck(deps, sanitized(cantStart(reason))));

const signInNeeded: AgentCheck = {
  status: 'sign-in-needed',
  reason: 'The Agent requires sign-in.',
};

export type AgentReadiness = {
  recheck: (agentId: string) => Promise<AgentCheck>;
  saveOpenFailure: (agentId: string, reason: string) => Promise<void>;
  recheckEvery: () => Promise<void>;
  // Background checks after install, sign-in, enablement and Server start; failures are already saved.
  recheckLater: (agentId: string) => void;
  recheckEveryLater: () => void;
  // An Agent answered session/new or a prompt with auth_required.
  signInRequired: (agentId: string) => void;
};

export const createAgentReadiness = (deps: ReadinessDeps): AgentReadiness => ({
  recheck: (agentId) => recheckAgent(deps, agentId),
  saveOpenFailure: (agentId, reason) => saveOpenFailure(deps, agentId, reason),
  recheckEvery: () => recheckEveryAgent(deps),
  recheckLater: (agentId) => {
    void recheckAgent(deps, agentId).catch(() => {});
  },
  recheckEveryLater: () => {
    void recheckEveryAgent(deps).catch(() => {});
  },
  signInRequired: (agentId) => {
    void save(deps, [agentId], savedCheck(deps, signInNeeded)).catch(() => {});
  },
});
