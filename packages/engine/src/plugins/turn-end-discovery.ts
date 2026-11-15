import { writeLog } from '@repo/machine-log';
import type { EndedTurn } from '../sessions';
import type { PluginOperationService } from './operations';

type Discovery = {
  home: string;
  operations: Pick<PluginOperationService, 'run'>;
};

/*
 * A Turn ended: the GitHub Plugin looks for the Session's pull request, only while it has none (ADR-0052). Every
 * answer is data and a failure is a log line, so a Plugin that is off, missing or failing never disturbs the Turn.
 */
export async function discoverPullRequests(
  { home, operations }: Discovery,
  { sessionId, projectId }: EndedTurn,
): Promise<void> {
  try {
    await operations.run({
      pluginId: 'github',
      name: 'discover',
      params: { unlessAttached: true },
      caller: { sessionId, projectId },
    });
  } catch (error) {
    writeLog({
      home,
      label: 'plugins',
      line: `Finding the pull request of Session ${sessionId} at Turn end did not run: ${String(error)}`,
    });
  }
}
