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
import type { OpenSessions } from '../open-sessions';
import type { Discovery } from './agent-options-discovery';

// No prompt reaches this Agent session, so it asks nothing; anything it asks anyway is refused.
const optionsDestination: AcpSessionDestination = {
  update: (): undefined => {},
  failed: () => {},
  requestPermission: async () => cancelledPermission,
  createElicitation: async () => cancelledElicitation,
};

// Discovery uses the same sign-in and failure contract as Send (ADR-0004).
const agentFailure = (cause: unknown): TRPCError => {
  const failure = new SessionOpenFailure(sessionOpenError(cause));

  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: failure.message,
    cause: failure,
  });
};

type DiscoveryOpening = {
  launch: DeferredAgentLaunch;
  cwd: string;
  signal: AbortSignal;
};

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
  deps: OpenSessions,
  { launch, cwd, signal }: DiscoveryOpening,
  progress: Discovery['progress'],
): Promise<AcpSessionLease> =>
  deps.acpResources.open({
    launch: withLoadingProgress(launch, progress),
    opening: { method: 'session/new', params: { cwd, mcpServers: [] } },
    destination: optionsDestination,
    signal,
  });

function prepareDiscovery(
  deps: OpenSessions,
  { agent, projectId }: SessionAgentOptionsInput,
): DiscoverySetup {
  const installed = requireInstalledAgent(deps.installedAgents, agent);
  const cwd = readProjectPath(deps.database, projectId);
  deps.admit();

  return { installed, cwd, projectId };
}

async function startDiscovery(
  deps: OpenSessions,
  { installed, cwd, projectId }: DiscoverySetup,
  { signal, progress }: Discovery,
): Promise<AcpSessionLease> {
  const launch = await deps.installedAgents.launch(installed, projectId, {
    signal,
    onInstalling: (fraction) => progress('installing', fraction),
  });

  return openDiscoverySession(deps, { launch, cwd, signal }, progress);
}

export async function openOptionsSession(
  deps: OpenSessions,
  input: SessionAgentOptionsInput,
  discovery: Discovery,
): Promise<AcpSessionLease> {
  const prepared = prepareDiscovery(deps, input);

  try {
    return await startDiscovery(deps, prepared, discovery);
  } catch (cause) {
    throw discovery.signal.aborted ? cause : agentFailure(cause);
  }
}

export function discoveryFailure(cause: unknown): SessionOpenError {
  if (cause instanceof TRPCError && cause.cause instanceof SessionOpenFailure)
    return cause.cause.openError;

  return sessionOpenError(cause);
}
