import type { AgentInstallation } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readInstallSelection, checkSelectedFiles } from './selection';
export const installationFailure = (error: unknown): string =>
  error instanceof Error ? error.message : 'Agent installation failed';
const checkStatus = async (
  home: string,
  database: Database,
  agentId: string,
): Promise<AgentInstallation> => {
  const selection = readInstallSelection(database, agentId);
  if (!selection) return { status: 'not-installed' };
  await checkSelectedFiles(home, agentId, selection);
  return {
    status: 'installed',
    version: selection.entry.version,
    readiness: 'not-checked',
  };
};
export const readInstallationStatus = async (
  home: string,
  database: Database,
  agentId: string,
): Promise<AgentInstallation> => {
  try {
    return await checkStatus(home, database, agentId);
  } catch (error) {
    return { status: 'failed', failure: installationFailure(error) };
  }
};
