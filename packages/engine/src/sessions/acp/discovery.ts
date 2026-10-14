import type {
  SessionNotification,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import type { SessionDiscovery, SessionDiscoveryInput } from '@repo/contracts';
import { createCheckout } from '@repo/git';
import { createRejectionCounter } from '@repo/machine-log';
import {
  resolveInstalledAgentLaunch,
  type AcpOpenInput,
  type AcpSessionDestination,
} from '../../agents';
import { readProjectPath } from '../../projects';
import { admitsNewSession } from '../agent-admission';
import type { OpenSessionsInput } from '../open-sessions-machine';
import { readAcpConfiguration } from './acp-configuration';

export type DiscoveryOperationInput = OpenSessionsInput & SessionDiscoveryInput;

class DiscoveryUpdates {
  private options: SessionConfigOption[] | null | undefined;
  private commands: SessionDiscovery['commands'] = [];
  private failure: unknown;

  public update: AcpSessionDestination['update'] = ({
    update,
  }: SessionNotification): undefined => {
    if (update.sessionUpdate === 'available_commands_update')
      this.commands = update.availableCommands.map(
        ({ name, description, input }) => ({
          name,
          description,
          inputHint: input?.hint,
        }),
      );

    if (update.sessionUpdate === 'config_option_update')
      this.options = update.configOptions;

    return undefined;
  };

  public failed: AcpSessionDestination['failed'] = (error): void => {
    this.failure = error;
  };

  public seed(options: SessionConfigOption[] | null | undefined): void {
    this.options ??= options;
  }

  public read(): SessionDiscovery {
    if (this.failure) throw this.failure;

    return {
      configOptions: readAcpConfiguration(
        this.options,
        createRejectionCounter('Session discovery'),
      ),
      commands: this.commands,
    };
  }
}

async function discoveryOpening(
  input: DiscoveryOperationInput,
  signal: AbortSignal,
): Promise<Omit<AcpOpenInput, 'destination'>> {
  if (!admitsNewSession(input, input.agent))
    throw new Error('Agent is unavailable');
  const projectPath = readProjectPath(input.database, input.projectId);
  const checkout = await discoveryCheckout(input, projectPath, signal);

  const launch = await resolveInstalledAgentLaunch(
    input.database,
    input.runtimeDirectory,
  )({ agent: input.agent, projectId: input.projectId, projectPath });

  return { launch, opening: newDiscoverySession(checkout.path), signal };
}

const discoveryCheckout = (
  input: DiscoveryOperationInput,
  projectPath: string,
  signal: AbortSignal,
): ReturnType<typeof createCheckout> =>
  createCheckout(
    {
      projectPath,
      projectId: input.projectId,
      sessionId: 'discovery',
      choice: { type: 'main' },
      runtimeDirectory: input.runtimeDirectory,
    },
    signal,
  );

function newDiscoverySession(path: string): AcpOpenInput['opening'] {
  return { method: 'session/new', params: { cwd: path, mcpServers: [] } };
}

/*
 * session/new is the finite discovery boundary. Closing drains admitted callbacks;
 * ACP offers no signal that an Agent has finished advertising Slash commands.
 */
export async function discoverSessionOptions(
  input: DiscoveryOperationInput,
  signal: AbortSignal,
): Promise<SessionDiscovery> {
  const updates = new DiscoveryUpdates();
  const opening = await discoveryOpening(input, signal);

  const lease = await input.acpResources.open({
    ...opening,
    destination: discoveryDestination(updates),
  });

  updates.seed(lease.response.configOptions);
  await lease.close();
  signal.throwIfAborted();

  return updates.read();
}

function discoveryDestination(
  updates: DiscoveryUpdates,
): AcpSessionDestination {
  return {
    update: updates.update,
    failed: updates.failed,
    requestPermission: async () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: async () => ({ action: 'cancel' }),
  };
}
