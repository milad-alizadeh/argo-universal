import {
  SessionOpenFailure,
  type SessionOpenError,
  type SessionAgentOptionsInput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import {
  type AcpSessionDestination,
  type AcpSessionLease,
  type DeferredAgentLaunch,
  cancelledElicitation,
  cancelledPermission,
  requireInstalledAgent,
  sessionOpenError,
} from '../../agents';
import { readProjectPath } from '../../projects';
import { toSlashCommands } from '../acp/acp-slash-commands';
import type { Discovery } from './agent-options-discovery';
import type { DiscoverySources } from './agent-options-shared';
import type { DiscoveredSlashCommands } from './discovered-slash-commands';

// A discovery's own ACP session, which also hears the Slash commands its Agent sends.
export type DiscoverySession = Discovery & {
  discovered: DiscoveredSlashCommands;
};

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

type DiscoveryOpening = { launch: DeferredAgentLaunch; cwd: string };

type DiscoveryPreparation = {
  installed: ReturnType<typeof requireInstalledAgent>;
  cwd: string;
};

type DiscoverySetup = DiscoveryPreparation & { projectId: string };

const withLoadingProgress = (
  launch: DeferredAgentLaunch,
  progress: Discovery['progress'],
): DeferredAgentLaunch => ({
  ...launch,
  resolve: async (signal) => {
    const resolved = await launch.resolve(signal);
    progress('loading');

    return resolved;
  },
});

const openDiscoverySession = (
  sources: DiscoverySources,
  { launch, cwd }: DiscoveryOpening,
  { signal, progress, discovered }: DiscoverySession,
): Promise<AcpSessionLease> =>
  sources.open.acpResources.open({
    launch: withLoadingProgress(launch, progress),
    opening: { method: 'session/new', params: { cwd, mcpServers: [] } },
    destination: optionsDestination(discovered),
    signal,
  });

function prepareDiscovery(
  sources: DiscoverySources,
  { agent, projectId }: SessionAgentOptionsInput,
): DiscoverySetup {
  const installed = requireInstalledAgent(sources.installedAgents, agent);
  const cwd = readProjectPath(sources.database, projectId);
  sources.open.admit();

  return { installed, cwd, projectId };
}

async function startDiscovery(
  sources: DiscoverySources,
  { installed, cwd, projectId }: DiscoverySetup,
  discovery: DiscoverySession,
): Promise<AcpSessionLease> {
  const launch = await sources.installedAgents.launch(installed, projectId, {
    signal: discovery.signal,
    onInstalling: (fraction) => discovery.progress('installing', fraction),
  });

  return openDiscoverySession(sources, { launch, cwd }, discovery);
}

export async function openOptionsSession(
  sources: DiscoverySources,
  input: SessionAgentOptionsInput,
  discovery: DiscoverySession,
): Promise<AcpSessionLease> {
  const prepared = prepareDiscovery(sources, input);

  try {
    return await startDiscovery(sources, prepared, discovery);
  } catch (cause) {
    throw discovery.signal.aborted ? cause : agentFailure(cause);
  }
}

export function discoveryFailure(cause: unknown): SessionOpenError {
  if (cause instanceof TRPCError && cause.cause instanceof SessionOpenFailure)
    return cause.cause.openError;

  return sessionOpenError(cause);
}
