import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { CustomAgentDefinition } from '@repo/contracts';
import type { Database } from '@repo/db';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import { jsonCodec } from '../../../lib/json-codec';
import { readConfiguredAgent } from '../../configuration/configuration-sql';
import { RegistryAgent } from '../../registry/registry-reader';
import { checkInstallationFile } from '../materialization/files';
import { installedCommand } from './installed-command';

const rejections = createRejectionCounter('Agent installations');

const SavedSelection = z.strictObject({
  directory: z.string().uuid(),
  executable: z.string(),
  entry: RegistryAgent,
  kind: z.enum(['binary', 'npx', 'uvx']),
  package: z.string().optional(),
  packageVersion: z.string().optional(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
});

export type InstallSelection = z.infer<typeof SavedSelection>;

const StoredSelection = jsonCodec(SavedSelection);

export const agentInstallDirectory = (home: string, agentId: string): string =>
  join(home, 'agents', createHash('sha256').update(agentId).digest('hex'));

export const selectedDirectory = (
  home: string,
  agentId: string,
  selection: InstallSelection,
): string => join(agentInstallDirectory(home, agentId), selection.directory);

const parseSelection = (release: string): InstallSelection => {
  try {
    return StoredSelection.parse(release);
  } catch {
    rejections.report('Stored Agent installation is malformed');
    throw new Error('Stored Agent installation is malformed');
  }
};

const selectedRelease = (
  database: Database,
  agentId: string,
): string | null => {
  const agent = readConfiguredAgent(database, agentId);

  if (!agent) return null;
  const configuration = agent.configuration;

  return configuration.source === 'registry' ? configuration.release : null;
};

export const readInstallSelection = (
  database: Database,
  agentId: string,
): InstallSelection | undefined => {
  const release = selectedRelease(database, agentId);

  if (!release) return undefined;

  return parseSelection(release);
};

export const checkSelectedFiles = (
  home: string,
  agentId: string,
  selection: InstallSelection,
): Promise<string> =>
  checkInstallationFile(
    selectedDirectory(home, agentId, selection),
    selection.executable,
  );

const selectionEnvironment = (
  selection: InstallSelection,
): { name: string; value: string }[] =>
  Object.entries(selection.env).map(([name, value]) => ({ name, value }));

export const selectedLaunchDefinition = (
  home: string,
  agentId: string,
  selection: InstallSelection,
): Promise<z.infer<typeof CustomAgentDefinition>> =>
  checkSelectedFiles(home, agentId, selection).then(async (executable) => ({
    name: selection.entry.name,
    ...(await installedCommand(selection, executable)),
    env: selectionEnvironment(selection),
  }));
