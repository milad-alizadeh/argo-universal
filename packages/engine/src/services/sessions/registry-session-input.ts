import { agentAdapters, findAgentAdapter } from '@repo/agents';
import { resolveCustomAgentLaunch } from '../agents';
import { readProjectPath } from '../projects';
import type { AcpSessionDependencies } from './conversation/acp-lifetime';
import type { RegistryCommand, RegistryInput } from './registry-machine';
import type { NewSessionInput } from './session-data';
import type { SessionMachineInput } from './session-machine';

type OpenSession = Extract<
  RegistryCommand,
  { type: 'sessions.create' | 'sessions.open' }
>;
type SessionSource = { context: RegistryInput; event: OpenSession };
// A custom Agent has no native adapter, so it always launches from its saved definition.
const selectLaunchResolver = (
  context: RegistryInput,
  agent: string,
): AcpSessionDependencies['resolveLaunch'] | undefined => {
  const native = (context.adapters ?? agentAdapters).some(
    (adapter): boolean => adapter.agent === agent,
  );
  // An injected resolver stands in for native Agents only; custom Agents always launch from SQLite.
  return native
    ? context.resolveAgentLaunch
    : resolveCustomAgentLaunch(context.database);
};
const createAcpSessionDependencies = (
  context: RegistryInput,
  agent: string,
): AcpSessionDependencies | undefined => {
  const resolveLaunch = selectLaunchResolver(context, agent);
  if (!context.acpResources || !resolveLaunch) return undefined;
  return {
    resources: context.acpResources,
    resolveLaunch,
    projectPath: (id) => readProjectPath(context.database, id),
  };
};

const createSessionCreationInput = (
  event: Extract<RegistryCommand, { type: 'sessions.create' }>,
): Omit<NewSessionInput, 'database' | 'runtimeDirectory' | 'sessionId'> => ({
  kind: 'new',
  projectId: event.projectId,
  projectPath: event.projectPath,
  agent: event.agent,
  checkout: event.checkout,
  configOptions: event.configOptions,
  prompt: event.prompt,
  turnId: event.turnId,
});

export const createRegistrySessionInput = ({
  context,
  event,
}: SessionSource): SessionMachineInput => ({
  database: context.database,
  runtimeDirectory: context.runtimeDirectory,
  now: context.now,
  createId: context.createId,
  adapter: findAgentAdapter(event.agent, context.adapters ?? agentAdapters),
  acp: createAcpSessionDependencies(context, event.agent),
  sessionId: event.sessionId,
  ...(event.type === 'sessions.create'
    ? createSessionCreationInput(event)
    : { kind: 'existing' }),
});
