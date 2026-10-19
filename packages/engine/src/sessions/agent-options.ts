import type {
  SessionAgentOptionsInput,
  SessionAgentOptionsOutput,
} from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { type AcpSessionDestination, requireInstalledAgent } from '../agents';
import { readProjectPath } from '../projects';
import { readAcpConfiguration } from './acp/acp-configuration';
import type { SessionRouterDeps } from './router-deps';
import { validateSessionCommandAdmission } from './session-command';

const rejections = createRejectionCounter('Agent options');

// No prompt reaches this ACP session, so it asks nothing; anything it asks anyway is refused.
const optionsDestination: AcpSessionDestination = {
  update: (): undefined => {},
  failed: () => {},
  requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
  createElicitation: async () => ({ action: 'cancel' }),
};

/*
 * Before Send, a New worktree has no Session to read options from (ADR-0023).
 * A new ACP session in the Project folder reports them and is closed at once;
 * no Session, Checkout, row or cache is created, and no prompt is sent.
 */
export async function readAgentOptions(
  deps: Pick<
    SessionRouterDeps,
    'database' | 'installedAgents' | 'sessions' | 'sessionCommandSignal'
  >,
  { agent, projectId }: SessionAgentOptionsInput,
  signal: AbortSignal | undefined,
): Promise<SessionAgentOptionsOutput> {
  const installed = requireInstalledAgent(deps.installedAgents, agent);
  const cwd = readProjectPath(deps.database, projectId);
  validateSessionCommandAdmission(deps);
  const withdrawn = signal ?? new AbortController().signal;

  const lease = await deps.sessions.getSnapshot().context.acpResources.open({
    launch: await deps.installedAgents.launch(installed, projectId, withdrawn),
    opening: { method: 'session/new', params: { cwd, mcpServers: [] } },
    destination: optionsDestination,
    signal: withdrawn,
  });

  try {
    return readAcpConfiguration(lease.response.configOptions, rejections);
  } finally {
    await lease.close();
  }
}
