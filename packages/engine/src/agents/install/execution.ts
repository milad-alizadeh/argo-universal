import { rm } from 'node:fs/promises';
import type {
  AgentInstallOperation,
  AgentsCatalogOutput,
} from '@repo/contracts';
import { writeDatabaseJobAndWaitForCommit } from '../../storage';
import { AgentConfigurationSaveJob } from '../agent-storage';
import { readAgentCatalog } from '../catalog-sql';
import type { ConfigurationDeps } from '../configuration/configuration-commands';
import { materializeAgent, type MaterializationInput } from './materialize';
import { resolveInstallRecipe } from './recipe';
import { savedInstallation } from './saved-configuration';
import { selectedDirectory, type InstallSelection } from './selection';
export type InstallExecutionInput = Pick<
  MaterializationInput,
  'home' | 'ports' | 'signal'
> & { deps: ConfigurationDeps; operation: AgentInstallOperation };
const selectedCatalogEntry = (
  input: InstallExecutionInput,
): AgentsCatalogOutput['agents'][number] => {
  const { agentId, version } = input.operation;
  const catalog = readAgentCatalog(input.deps.database).agents.find(
    (agent) => agent.id === agentId,
  );
  if (!catalog) throw new Error('Agent is not in the cached Registry');
  if (catalog.entry.version !== version)
    throw new Error(
      'The selected release changed. Review the Agent before installing',
    );
  return catalog;
};
const prepareMaterialization = (
  input: InstallExecutionInput,
): MaterializationInput => {
  const catalog = selectedCatalogEntry(input),
    { agentId, operationId } = input.operation;
  return {
    ...input,
    agentId,
    operationId,
    entry: catalog.entry,
    recipe: resolveInstallRecipe(catalog.entry, catalog.support),
  };
};
const saveSelection = (
  input: InstallExecutionInput,
  selection: InstallSelection,
): Promise<void> => {
  const saved = savedInstallation(
    input.deps.database,
    input.operation.agentId,
    selection,
  );
  return writeDatabaseJobAndWaitForCommit(
    input.deps.databaseWriter,
    new AgentConfigurationSaveJob(saved),
    true,
  );
};
export const executeAgentInstall = async (
  input: InstallExecutionInput,
): Promise<void> => {
  const selection = await materializeAgent(prepareMaterialization(input));
  try {
    input.signal.throwIfAborted();
    await saveSelection(input, selection);
  } catch (error) {
    await rm(
      selectedDirectory(input.home, input.operation.agentId, selection),
      { recursive: true, force: true },
    );
    throw error;
  }
};
