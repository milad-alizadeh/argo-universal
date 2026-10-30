import {
  SessionOpenFailure,
  type SessionOpenError,
  type SessionAgentOptionsInput,
} from '@repo/contracts';
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
import { toSlashCommands } from './acp/acp-slash-commands';
import type { OptionsDeps, Discovery } from './agent-options-discovery';
import type { DiscoveredSlashCommands } from './discovered-slash-commands';
import { validateSessionCommandAdmission } from './session-command';

// No prompt reaches this Agent session, so it asks nothing; anything it asks anyway is refused.
const optionsDestination = (
  discovered: DiscoveredSlashCommands,
): AcpSessionDestination => ({
  update: ({ update }): undefined => {
    if (update.sessionUpdate === 'available_commands_update')
      discovered.receive(toSlashCommands(update.availableCommands));
  },
  failed: () => {},
  requestPermission: async () => cancelledPermission,
  createElicitation: async () => cancelledElicitation,
});

// Discovery uses the same sign-in and failure contract as Send (ADR-0004).
const agentFailure = (cause: unknown): TRPCError => {
  const failure = new SessionOpenFailure(sessionOpenError(cause));

  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: failure.message,
    cause: failure,
  });
};

export async function openOptionsSession(
  deps: OptionsDeps,
  { agent, projectId }: SessionAgentOptionsInput,
  {
    signal,
    progress,
    discovered,
  }: Discovery & {
    discovered: DiscoveredSlashCommands;
  },
): Promise<AcpSessionLease> {
  const installed = requireInstalledAgent(deps.installedAgents, agent);
  const cwd = readProjectPath(deps.database, projectId);
  validateSessionCommandAdmission(deps);

  try {
    const launch = await deps.installedAgents.launch(installed, projectId, {
      signal,
      onInstalling: (fraction) => progress('installing', fraction),
    });

    return await deps.sessions.getSnapshot().context.acpResources.open({
      launch: {
        ...launch,
        resolve: async (signal) => {
          const resolved = await launch.resolve(signal);
          progress('loading');

          return resolved;
        },
      },
      opening: { method: 'session/new', params: { cwd, mcpServers: [] } },
      destination: optionsDestination(discovered),
      signal,
    });
  } catch (cause) {
    throw signal.aborted ? cause : agentFailure(cause);
  }
}

export function discoveryFailure(cause: unknown): SessionOpenError {
  if (cause instanceof TRPCError && cause.cause instanceof SessionOpenFailure)
    return cause.cause.openError;

  return sessionOpenError(cause);
}
