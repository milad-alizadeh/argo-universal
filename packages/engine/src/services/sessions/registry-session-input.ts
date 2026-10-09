import { agentAdapters, findAgentAdapter } from '@repo/agents';
import type { RegistryCommand, RegistryInput } from './registry-machine';
import type { NewSessionInput } from './session-data';
import type { SessionMachineInput } from './session-machine';

type OpenSession = Extract<
  RegistryCommand,
  { type: 'sessions.create' | 'sessions.open' }
>;
type SessionSource = { context: RegistryInput; event: OpenSession };

const creationInput = (
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
  sessionId: event.sessionId,
  ...(event.type === 'sessions.create'
    ? creationInput(event)
    : { kind: 'existing' }),
});
