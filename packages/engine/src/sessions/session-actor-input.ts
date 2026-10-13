import { agentAdapters, findAgentAdapter } from '@repo/agents';
import { selectAgentLaunchResolver } from '../agents';
import { readProjectPath } from '../projects';
import type { AcpSessionDependencies } from './acp/acp-lifetime';
import type {
  OpenSessionsCommand,
  OpenSessionsInput,
} from './open-sessions-machine';
import type { NewSessionInput } from './session-data';
import type { SessionMachineInput } from './session-machine';

type OpenSession = Extract<
  OpenSessionsCommand,
  { type: 'sessions.create' | 'sessions.open' }
>;
type SessionSource = { context: OpenSessionsInput; event: OpenSession };

const createAcpSessionDependencies = (
  context: OpenSessionsInput,
  agent: string,
): AcpSessionDependencies | undefined => {
  const resolveLaunch = selectAgentLaunchResolver(context, agent);
  if (!context.acpResources || !resolveLaunch) return undefined;
  return {
    resources: context.acpResources,
    resolveLaunch,
    projectPath: (id) => readProjectPath(context.database, id),
  };
};

// False when the Agent runs on its native adapter, which sends only text.
export const runsOverAcp = (
  context: OpenSessionsInput,
  agent: string,
): boolean => createAcpSessionDependencies(context, agent) !== undefined;

const createSessionCreationInput = (
  event: Extract<OpenSessionsCommand, { type: 'sessions.create' }>,
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

export const createSessionActorInput = ({
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
