import { rm } from 'node:fs/promises';
import type {
  AgentInstallOperation,
  AgentsCatalogOutput,
} from '@repo/contracts';
import { writeDatabaseJobAndWaitForCommit } from '../../../storage';
import { AgentConfigurationSaveJob } from '../../agent-storage';
import { readAgentCatalog } from '../../catalog-sql';
import type { ConfigurationDeps } from '../../configuration/configuration-commands';
import {
  materializeAgent,
  type MaterializationInput,
} from '../materialization/materialize';
import { resolveInstallRecipe } from '../materialization/recipe';
import { savedInstallation } from '../selection/saved-configuration';
import {
  selectedDirectory,
  type InstallSelection,
} from '../selection/selection';
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
const discardSelection = (
  input: InstallExecutionInput,
  selection: InstallSelection,
): Promise<void> =>
  rm(selectedDirectory(input.home, input.operation.agentId, selection), {
    recursive: true,
    force: true,
  });
const materializeAfterReadiness = async (
  input: MaterializationInput,
  checking: Promise<unknown> | undefined,
): Promise<InstallSelection> => {
  await checking;
  input.signal.throwIfAborted();
  return materializeAgent(input);
};
export const executeAgentInstall = async (
  input: InstallExecutionInput,
  checking?: Promise<unknown>,
): Promise<void> => {
  const materialization = prepareMaterialization(input);
  const selection = await materializeAfterReadiness(materialization, checking);
  try {
    input.signal.throwIfAborted();
    await saveSelection(input, selection);
  } catch (error) {
    await discardSelection(input, selection);
    throw error;
  }
};
