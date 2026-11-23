import { writeLog } from '@repo/machine-log';
import type { EndedTurn } from '../sessions';
import type { PluginOperationService } from './operations';

type Discovery = {
  home: string;
  operations: {
    rows: () => Promise<{ id: string }[]>;
    run: PluginOperationService['run'];
  };
  signInRequired: (sessionId: string) => void;
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

  const answer = await discovery.operations.run({
    pluginId: 'github',
    name: 'discover',
    params: { unlessAttached: true },
    caller: { sessionId, projectId },
  });

  if (
    answer &&
    typeof answer === 'object' &&
    !Array.isArray(answer) &&
    answer.result === 'unavailable' &&
    answer.signIn === true
  )
    discovery.signInRequired(sessionId);
}

/*
 * A Turn ended: the GitHub Plugin, when it is on, looks for the Session's pull request, only while it has none
 * (ADR-0052). Sign-in failures are shown in the Feed. Operation exceptions go to the log.
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
