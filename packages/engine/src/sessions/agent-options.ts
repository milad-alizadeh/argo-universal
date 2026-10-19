import {
  SessionOpenFailure,
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import {
  type AcpSessionDestination,
  type AcpSessionLease,
  cancelledElicitation,
  cancelledPermission,
  requireInstalledAgent,
  sessionOpenError,
} from '../agents';
import { readProjectPath } from '../projects';
import { readAcpConfiguration } from './acp/acp-configuration';
import type { SessionRouterDeps } from './router-deps';
import { validateSessionCommandAdmission } from './session-command';

const rejections = createRejectionCounter('Agent options');

// No prompt reaches this Agent session, so it asks nothing; anything it asks anyway is refused.
const optionsDestination: AcpSessionDestination = {
  update: (): undefined => {},
  failed: () => {},
  requestPermission: async () => cancelledPermission,
  createElicitation: async () => cancelledElicitation,
};

type OptionsDeps = Pick<
  SessionRouterDeps,
  'database' | 'installedAgents' | 'sessions' | 'sessionCommandSignal'
>;

/*
 * The Agent's launch or sign-in failure, as Send's open would report it (ADR-0004), so the
 * App leaves it to Send's callout instead of showing it twice.
 */
const agentFailure = (cause: unknown): TRPCError => {
  const failure = new SessionOpenFailure(sessionOpenError(cause));

  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: failure.message,
    cause: failure,
  });
};

async function openOptionsSession(
  deps: OptionsDeps,
  { agent, projectId }: SessionAgentOptionsInput,
  signal: AbortSignal,
): Promise<AcpSessionLease> {
  const installed = requireInstalledAgent(deps.installedAgents, agent);
  const cwd = readProjectPath(deps.database, projectId);
  validateSessionCommandAdmission(deps);

  try {
    return await deps.sessions.getSnapshot().context.acpResources.open({
      launch: await deps.installedAgents.launch(installed, projectId, signal),
      opening: { method: 'session/new', params: { cwd, mcpServers: [] } },
      destination: optionsDestination,
      signal,
    });
  } catch (cause) {
    throw signal.aborted ? cause : agentFailure(cause);
  }
}

/*
 * Before Send, a New worktree has no Session to read options from (ADR-0023).
 * A new Agent session in the Project folder reports them and is closed at once;
 * no Session, Checkout, row or cache is created, and no prompt is sent.
 */
export async function readAgentOptions(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  signal: AbortSignal = new AbortController().signal,
): Promise<SessionAgentOptionsOutput> {
  const lease = await openOptionsSession(deps, input, signal);

  try {
    return readAcpConfiguration(lease.response.configOptions, rejections);
  } finally {
    await lease.close();
  }
}
