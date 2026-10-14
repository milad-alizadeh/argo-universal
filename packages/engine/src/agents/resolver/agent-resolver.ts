import { isAbsolute } from 'node:path';
import type { CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import {
  InstallationObservationSaveJob,
  type InstallationObservationRow,
} from '../agent-storage';
import { readConfiguredAgent } from '../configuration/configuration-sql';
import {
  type Installation,
  readRegistrySource,
  resolveRegistryInstallation,
} from './installation';
import { findOnPath } from './path-lookup';

export type ResolverDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  home: string;
  now: () => number;
};
// A look older than this is repeated when the Agents page opens.
const staleAfterMs = 10_000;

type Candidate = {
  id: string;
  catalogPresent: boolean;
  configured: boolean;
  saved: Omit<InstallationObservationRow, 'id'>;
};
const readCandidates = (database: Database): Candidate[] =>
  database
    .select({
      id: agents.id,
      catalogPresent: agents.catalogPresent,
      configuration: agents.configuration,
      installationLaunch: agents.installationLaunch,
      installationOwner: agents.installationOwner,
      installationVersion: agents.installationVersion,
      installationObservedAt: agents.installationObservedAt,
    })
    .from(agents)
    .all()
    .map(({ id, catalogPresent, configuration, ...saved }) => ({
      id,
      catalogPresent,
      configured: configuration !== null,
      saved,
    }));

const customInstallation = async (
  definition: CustomAgentDefinition,
): Promise<Installation | undefined> => {
  const executable = isAbsolute(definition.executable)
    ? definition.executable
    : await findOnPath(definition.executable);
  return executable
    ? { definition: { ...definition, executable }, owner: 'unknown' }
    : undefined;
};

// Looks in Argo's folder, then on PATH; a catalog-only row the catalog no longer lists is left alone.
const resolveCandidate = async (
  deps: ResolverDeps,
  candidate: Candidate,
): Promise<Installation | undefined | null> => {
  const agent = readConfiguredAgent(deps.database, candidate.id);
  if (agent?.configuration.source === 'custom')
    return customInstallation(agent.configuration.definition);
  if (!candidate.configured && !candidate.catalogPresent) return null;
  const source = readRegistrySource(deps.database, candidate.id);
  if (!source) return null;
  return resolveRegistryInstallation(deps.home, candidate.id, source);
};

const observationRow = (
  id: string,
  found: Installation | undefined,
  observedAt: number,
): InstallationObservationRow => ({
  id,
  installationLaunch: found
    ? JSON.stringify({
        executable: found.definition.executable,
        args: found.definition.args,
      })
    : null,
  installationOwner: found?.owner ?? null,
  installationVersion: found?.version ?? null,
  installationObservedAt: observedAt,
});

// The time on a row is when its current observation was first made; an unchanged look writes nothing.
const isUnchanged = (
  candidate: Candidate,
  next: InstallationObservationRow,
): boolean => {
  const { saved } = candidate;
  if (saved.installationObservedAt === null)
    return !candidate.configured && next.installationLaunch === null;
  return (
    saved.installationLaunch === next.installationLaunch &&
    saved.installationOwner === next.installationOwner &&
    saved.installationVersion === next.installationVersion
  );
};

// Registering, installing or editing an Agent checks it already; only a copy found outside Argo needs a first check here.
const needsFirstCheck = (
  deps: ResolverDeps,
  candidate: Candidate,
  found: Installation | undefined,
): boolean =>
  found?.owner === 'unknown' &&
  candidate.saved.installationLaunch === null &&
  readConfiguredAgent(deps.database, candidate.id)?.configuration.source !==
    'custom';

type Scan = { rows: InstallationObservationRow[]; newlyFound: string[] };
const scan = async (deps: ResolverDeps): Promise<Scan> => {
  const observedAt = deps.now();
  const result: Scan = { rows: [], newlyFound: [] };
  for (const candidate of readCandidates(deps.database)) {
    const found = await resolveCandidate(deps, candidate);
    if (found === null) continue;
    const row = observationRow(candidate.id, found, observedAt);
    if (isUnchanged(candidate, row)) continue;
    result.rows.push(row);
    if (needsFirstCheck(deps, candidate, found))
      result.newlyFound.push(candidate.id);
  }
  return result;
};

const resolveEvery = async (deps: ResolverDeps): Promise<string[]> => {
  const { rows, newlyFound } = await scan(deps);
  if (rows.length > 0)
    await writeDatabaseJobAndWaitForCommit(
      deps.databaseWriter,
      new InstallationObservationSaveJob(rows),
      true,
    );
  return newlyFound;
};

export type AgentResolver = {
  // Saves an Installation observation for every catalog entry and custom Agent; returns the Agents found outside Argo that were not before.
  resolveEvery: () => Promise<string[]>;
  // When the Agents page opens: looks again only when the last look is stale.
  resolveIfStale: () => Promise<string[]>;
};

// One scan at a time, so a later look always commits after an earlier one.
export const createAgentResolver = (deps: ResolverDeps): AgentResolver => {
  let queue: Promise<unknown> = Promise.resolve();
  let lookedAt = -Infinity;
  const serialized = (): Promise<string[]> => {
    const look = (): Promise<string[]> => {
      lookedAt = deps.now();
      return resolveEvery(deps);
    };
    const next = queue.then(look, look);
    queue = next.catch(() => {});
    return next;
  };
  return {
    resolveEvery: serialized,
    resolveIfStale: () =>
      deps.now() - lookedAt > staleAfterMs
        ? serialized()
        : Promise.resolve([]),
  };
};
