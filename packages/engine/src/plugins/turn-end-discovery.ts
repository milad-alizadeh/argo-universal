import { writeLog } from '@repo/machine-log';
import type { EndedTurn } from '../sessions';
import type { PluginOperationService } from './operations';

type Discovery = {
  home: string;
  operations: Pick<PluginOperationService, 'rows' | 'run'>;
};

const discoverId = 'github.discover';

// No GitHub Plugin, or one turned off, declares no such Operation: nothing to look for, and nothing to log.
async function isDeclared({ operations }: Discovery): Promise<boolean> {
  return (await operations.rows()).some(({ id }) => id === discoverId);
}

const failed = ({ home }: Discovery, sessionId: string, reason: string): void =>
  writeLog({
    home,
    label: 'plugins',
    line: `Finding the pull request of Session ${sessionId} at Turn end did not run: ${reason}`,
  });

async function look(
  discovery: Discovery,
  { sessionId, projectId }: EndedTurn,
): Promise<void> {
  if (!(await isDeclared(discovery))) return;

  await discovery.operations.run({
    pluginId: 'github',
    name: 'discover',
    params: { unlessAttached: true },
    caller: { sessionId, projectId },
  });
}

/*
 * A Turn ended: the GitHub Plugin, when it is on, looks for the Session's pull request, only while it has none
 * (ADR-0052). Every answer is data and a failure is a log line, so a Plugin that fails never disturbs the Turn.
 */
export async function discoverPullRequests(
  discovery: Discovery,
  turn: EndedTurn,
): Promise<void> {
  try {
    await look(discovery, turn);
  } catch (error) {
    failed(discovery, turn.sessionId, String(error));
  }
}
