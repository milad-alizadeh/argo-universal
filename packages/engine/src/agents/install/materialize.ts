import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { CustomAgentDefinition, type ACPAgent } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { materializeBinary } from './archive';
import { checkInstallationFile } from './files';
import { installedCommand } from './installed-command';
import { materializePackage } from './packages';
import type { InstallPorts } from './ports';
import { InstallCleanupError } from './process';
import type { InstallRecipe } from './recipe';
import { agentInstallDirectory, type InstallSelection } from './selection';
export type MaterializationInput = {
  home: string;
  agentId: string;
  operationId: string;
  entry: ACPAgent;
  recipe: InstallRecipe;
  signal: AbortSignal;
  ports: InstallPorts;
};
const rejections = createRejectionCounter('Registry launch definitions');
const recipeEnvironment = (
  input: MaterializationInput,
): { name: string; value: string }[] =>
  Object.entries(input.recipe.env).map(([name, value]) => ({ name, value }));
const validateLaunch = (input: MaterializationInput): void => {
  const result = CustomAgentDefinition.safeParse({
    name: input.entry.name,
    executable: 'agent',
    args: input.recipe.args,
    env: recipeEnvironment(input),
  });
  if (result.success) return;
  rejections.report('Rejected unsafe registry launch definition');
  throw new Error(
    'Registry launch definition contains unsupported arguments or environment',
  );
};
const installBinaryFiles = async (
  input: MaterializationInput,
  directory: string,
): Promise<string> => {
  if (input.recipe.kind !== 'binary')
    throw new Error('Expected a binary distribution');
  const bytes = await input.ports.download(input.recipe.archive, input.signal);
  return materializeBinary({
    directory,
    recipe: input.recipe,
    bytes,
    ports: input.ports,
    signal: input.signal,
  });
};
const installFiles = (
  input: MaterializationInput,
  directory: string,
): Promise<string> => {
  if (input.recipe.kind === 'binary')
    return installBinaryFiles(input, directory);
  return materializePackage({
    directory,
    recipe: input.recipe,
    signal: input.signal,
    ports: input.ports,
  });
};
const createSelection = (
  input: MaterializationInput,
  executable: string,
): InstallSelection => ({
  directory: input.operationId,
  executable,
  entry: input.entry,
  kind: input.recipe.kind,
  args: [...input.recipe.args],
  env: input.recipe.env,
  ...(input.recipe.kind === 'binary'
    ? {}
    : { package: input.recipe.package, packageVersion: input.recipe.version }),
});
const verifyMaterializedCommand = async (
  input: MaterializationInput,
  staging: string,
  executable: string,
): Promise<void> => {
  const file = await checkInstallationFile(staging, executable);
  await installedCommand(createSelection(input, executable), file);
};
const publishMaterialization = async (
  input: MaterializationInput,
  staging: string,
): Promise<InstallSelection> => {
  const executable = await installFiles(input, staging);
  await verifyMaterializedCommand(input, staging, executable);
  input.signal.throwIfAborted();
  await rename(
    staging,
    join(agentInstallDirectory(input.home, input.agentId), input.operationId),
  );
  return createSelection(input, executable);
};
const materializeStaging = async (
  input: MaterializationInput,
  staging: string,
): Promise<InstallSelection> => {
  await mkdir(staging, { recursive: true });
  try {
    return await publishMaterialization(input, staging);
  } catch (error) {
    if (!(error instanceof InstallCleanupError))
      await rm(staging, { recursive: true, force: true });
    throw error;
  }
};
export const materializeAgent = (
  input: MaterializationInput,
): Promise<InstallSelection> => {
  if (process.platform === 'win32')
    throw new Error('Managed Agent installation is unsupported on Windows');
  validateLaunch(input);
  return materializeStaging(
    input,
    join(
      agentInstallDirectory(input.home, input.agentId),
      `.install-${input.operationId}`,
    ),
  );
};
