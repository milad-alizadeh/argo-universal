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
  // Setup ownership: waits for an install or edit, shares a running check and keeps cleanup failures owned.
  withAgentCheck: (
    agentId: string,
    operation: () => Promise<AgentCheck>,
  ) => Promise<AgentCheck>;
};
const startConcurrency = 4;

// Runs inside setup ownership, so it reads the Agent as committed after any install or edit it waited for.
const runCheck = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  const target = readTarget(deps.database, agentId);
  const missing = await missingFiles(deps.home, target);
  if (missing) return missing;
  const launch = await resolveInstalledAgentLaunch(
    deps.database,
    deps.home,
  )({ agent: agentId, projectId: '', projectPath: homedir() });
  return deps.checkAgentLaunch({ name: target.name, launch });
};

const sanitized = (check: AgentCheck): AgentCheck =>
  check.reason === undefined
    ? { status: check.status }
    : { status: check.status, reason: sanitizeReason(check.reason) };

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

const checkAndSave = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  let check: AgentCheck;
  try {
    check = await deps.withAgentCheck(agentId, () => runCheck(deps, agentId));
  } catch (error) {
    if (error instanceof ReadinessSkipped) throw error;
    check = readinessOfFailure(error);
  }
  const result = sanitized(check);
  await save(deps, [agentId], savedCheck(deps, result));
  return result;
};

// Shows the Agent as Checking… at once, then saves what the shared ACP check observed.
const recheckAgent = async (
  deps: ReadinessDeps,
  agentId: string,
): Promise<AgentCheck> => {
  readTarget(deps.database, agentId);
  await save(deps, [agentId], pendingReadiness);
  return checkAndSave(deps, agentId);
};

const runBounded = async (
  agentIds: readonly string[],
  check: (agentId: string) => Promise<unknown>,
): Promise<void> => {
  const queue = [...agentIds];
  const worker = async (): Promise<void> => {
    for (let next = queue.shift(); next; next = queue.shift())
      await check(next).catch(() => {});
  };
  await Promise.all(Array.from({ length: startConcurrency }, worker));
};

// Every installed, enabled Agent is checked again; saved results are never trusted. Disabled Agents never run.
const recheckEveryAgent = async (deps: ReadinessDeps): Promise<void> => {
  const agentIds = checkableAgents(deps.database);
  await save(deps, agentIds, pendingReadiness);
  await runBounded(agentIds, (agentId) => checkAndSave(deps, agentId));
};

// A saved Ready that failed to open a Session: saved as Can't start with what the Session observed.
export const saveOpenFailure = (
  deps: ReadinessDeps,
  agentId: string,
  reason: string,
): Promise<void> =>
  save(deps, [agentId], savedCheck(deps, sanitized(cantStart(reason))));

export type AgentReadiness = {
  recheck: (agentId: string) => Promise<AgentCheck>;
  saveOpenFailure: (agentId: string, reason: string) => Promise<void>;
  recheckEvery: () => Promise<void>;
  // Background checks after install, sign-in, enablement and Server start; failures are already saved.
  recheckLater: (agentId: string) => void;
  recheckEveryLater: () => void;
};
// `automatic` off leaves only explicit Rechecks, for tests that count Agent processes.
export const createAgentReadiness = (
  deps: ReadinessDeps,
  automatic = true,
): AgentReadiness => ({
  recheck: (agentId) => recheckAgent(deps, agentId),
  saveOpenFailure: (agentId, reason) => saveOpenFailure(deps, agentId, reason),
  recheckEvery: () => recheckEveryAgent(deps),
  recheckLater: (agentId) => {
    if (automatic) void recheckAgent(deps, agentId).catch(() => {});
  },
  recheckEveryLater: () => {
    if (automatic) void recheckEveryAgent(deps).catch(() => {});
  },
});
