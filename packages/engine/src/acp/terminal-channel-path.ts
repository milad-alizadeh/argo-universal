import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
const ownerOnlyMode = 0o700;
const channelDirectory = (token: string): string =>
  join('/tmp', `argo-terminal-${token}`);
export const createTerminalChannelPath = async (
  token: string,
): Promise<string> => {
  const directory = channelDirectory(token);
  await mkdir(directory, { mode: ownerOnlyMode });
  return join(directory, 'control');
};
export const removeTerminalChannelPath = (token: string): Promise<void> =>
  rm(channelDirectory(token), { recursive: true, force: true });
