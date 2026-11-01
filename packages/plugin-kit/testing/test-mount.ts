import type { Opening, PluginMount } from './view';

export function mountOpening(input: PluginMount): Opening {
  const { page, surface, projectId, sessionId, connectionId } = input;

  return { path: page, surface, projectId, sessionId, connectionId };
}

export function requireAccepted(
  log: string,
  {
    offset,
    path,
    pluginId,
  }: { offset: number; path: string; pluginId: string },
): void {
  const refused = log
    .slice(offset)
    .split('\n')
    .find((line) => line.includes(`Plugin ${pluginId}: refused ${path}`));

  if (refused) throw new Error(refused);
}

export const testSession = {
  id: 'test-session',
  projectId: 'test-project',
  agent: 'test-agent',
};
