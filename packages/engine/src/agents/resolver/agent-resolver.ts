import type { Database } from '@repo/db';
import {
  type WriterActorRef,
  writeDatabaseJobAndWaitForCommit,
} from '../../storage';
import { type Candidate, readCandidates, resolveCandidate } from './candidates';
import type { Installation } from './installation';
import {
  InstallationObservationSaveJob,
  type InstallationObservationRow,
} from './observation-storage';

export type ResolverDeps = {
  database: Database;
  databaseWriter: WriterActorRef;
  home: string;
  now: () => number;
};
// A look older than this is repeated when the Agents page opens.
const staleAfterMs = 10_000;

type FoundColumns = Omit<
  InstallationObservationRow,
  'id' | 'installationObservedAt'
>;
const nothingFound: FoundColumns = {
  installationLaunch: null,
  installationOwner: null,
  installationVersion: null,
};
const foundColumns = (found: Installation | undefined): FoundColumns =>
  found
    ? {
        installationLaunch: JSON.stringify({
          executable: found.definition.executable,
          args: found.definition.args,
        }),
        installationOwner: found.owner,
        installationVersion: found.version ?? null,
      }
    : nothingFound;

const observedFields = [
  'installationLaunch',
  'installationOwner',
  'installationVersion',
] as const;
// A never-observed row needs a first observation only once there is something to say.
const isNothingNew = (
  candidate: Candidate,
  next: InstallationObservationRow,
): boolean => !candidate.configured && next.installationLaunch === null;
// The time on a row is when its current observation was first made; an unchanged look writes nothing.
const isUnchanged = (
  candidate: Candidate,
  next: InstallationObservationRow,
): boolean =>
  candidate.saved.installationObservedAt === null
    ? isNothingNew(candidate, next)
    : observedFields.every((field) => candidate.saved[field] === next[field]);

const isNewOutsideCopy = (
  candidate: Candidate,
  found: Installation | undefined,
): boolean =>
  found?.owner === 'unknown' && candidate.saved.installationLaunch === null;
// Registering, installing or editing an Agent checks it already; only a copy found outside Argo needs a first check here.
const needsFirstCheck = (
  candidate: Candidate,
  found: Installation | undefined,
): boolean => !candidate.custom && isNewOutsideCopy(candidate, found);

type Look = { row: InstallationObservationRow; newlyFound: boolean };
const lookAt = async (
  deps: ResolverDeps,
  candidate: Candidate,
  observedAt: number,
): Promise<Look | undefined> => {
  const found = await resolveCandidate(deps, candidate);
  if (found === null) return undefined;
  const row = {
    id: candidate.id,
    installationObservedAt: observedAt,
    ...foundColumns(found),
  };
  if (isUnchanged(candidate, row)) return undefined;
  return { row, newlyFound: needsFirstCheck(candidate, found) };
};

const scan = async (deps: ResolverDeps): Promise<Look[]> => {
  const observedAt = deps.now();
  const looks: Look[] = [];
  for (const candidate of readCandidates(deps.database)) {
    const look = await lookAt(deps, candidate, observedAt);
    if (look) looks.push(look);
  }
  return looks;
};

const resolveEvery = async (deps: ResolverDeps): Promise<string[]> => {
  const looks = await scan(deps);
  if (looks.length > 0)
    await writeDatabaseJobAndWaitForCommit(
      deps.databaseWriter,
      new InstallationObservationSaveJob(looks.map(({ row }) => row)),
      true,
    );
  return looks.filter(({ newlyFound }) => newlyFound).map(({ row }) => row.id);
};

export type AgentResolver = {
  // Saves an Installation observation for every catalog entry and custom Agent; returns the Agents found outside Argo that were not before.
  resolveEvery: () => Promise<string[]>;
  // When the Agents page opens: looks again only when the last look is stale.
  resolveIfStale: () => Promise<string[]>;
};

type ResolverState = { queue: Promise<unknown>; lookedAt: number };
const lookNow = (
  deps: ResolverDeps,
  state: ResolverState,
): Promise<string[]> => {
  state.lookedAt = deps.now();
  return resolveEvery(deps);
};

// One scan at a time, so a later look always commits after an earlier one.
const serializedLooks =
  (deps: ResolverDeps, state: ResolverState): (() => Promise<string[]>) =>
  () => {
    const next = state.queue.then(
      () => lookNow(deps, state),
      () => lookNow(deps, state),
    );
    state.queue = next.catch(() => {});
    return next;
  };

export const createAgentResolver = (deps: ResolverDeps): AgentResolver => {
  const state: ResolverState = {
    queue: Promise.resolve(),
    lookedAt: -Infinity,
  };
  const serialized = serializedLooks(deps, state);
  const isStale = (): boolean => deps.now() - state.lookedAt > staleAfterMs;
  return {
    resolveEvery: serialized,
    resolveIfStale: () => (isStale() ? serialized() : Promise.resolve([])),
  };
};

// Looks again in the background and checks each Agent found outside Argo for the first time.
export const checkNewlyFound = (
  look: Promise<string[]>,
  recheckLater: (agentId: string) => void,
): void => {
  void look
    .then((found) => {
      for (const agentId of found) recheckLater(agentId);
    })
    .catch(() => {});
};
