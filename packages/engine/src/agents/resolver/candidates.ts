import { isAbsolute } from 'node:path';
import type { CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import {
  readConfiguredAgent,
  selectCustomDefinition,
} from '../configuration/configuration-sql';
import {
  type Installation,
  readRegistrySource,
  type RegistrySource,
  resolveRegistryInstallation,
} from './installation';
import type { InstallationObservationRow } from './observation-storage';
import { findOnPath } from './path-lookup';

// One Agent the Resolver looks for, with what it saved last time.
export type Candidate = {
  id: string;
  catalogPresent: boolean;
  configured: boolean;
  custom?: CustomAgentDefinition;
  saved: Omit<InstallationObservationRow, 'id'>;
};

type CandidateRow = Omit<Candidate, 'configured' | 'custom' | 'saved'> &
  Candidate['saved'] & { configuration: string | null };
const readRows = (database: Database): CandidateRow[] =>
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
    .all();

const customDefinitionOf = (
  database: Database,
  agentId: string,
): CustomAgentDefinition | undefined => {
  const agent = readConfiguredAgent(database, agentId);
  return agent && selectCustomDefinition(agent);
};

export const readCandidates = (database: Database): Candidate[] =>
  readRows(database).map(({ id, catalogPresent, configuration, ...saved }) => ({
    id,
    catalogPresent,
    configured: configuration !== null,
    custom: customDefinitionOf(database, id),
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

// A catalog-only row the catalog no longer lists is left alone.
const registrySourceOf = (
  database: Database,
  candidate: Candidate,
): RegistrySource | undefined =>
  candidate.configured || candidate.catalogPresent
    ? readRegistrySource(database, candidate.id)
    : undefined;

// Looks in Argo's folder, then on PATH; null when there is nothing to look for.
export const resolveCandidate = async (
  deps: { database: Database; home: string },
  candidate: Candidate,
): Promise<Installation | undefined | null> => {
  if (candidate.custom) return customInstallation(candidate.custom);
  const source = registrySourceOf(deps.database, candidate);
  return source
    ? resolveRegistryInstallation(deps.home, candidate.id, source)
    : null;
};
