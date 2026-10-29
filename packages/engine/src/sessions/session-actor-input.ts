import type { AcpSessionDependencies } from './acp/acp-lifetime';
import type {
  OpenSessionsCommand,
  OpenSessionsInput,
} from './open-sessions-machine';
import type { NewSessionInput } from './session-data';
import type { SessionMachineInput } from './session-machine';

type OpenSession = Extract<
  OpenSessionsCommand,
  { type: 'sessions.create' | 'sessions.open' | 'sessions.archive' }
>;

type SessionSource = { context: OpenSessionsInput; event: OpenSession };

type CreationInput = Omit<
  NewSessionInput,
  'database' | 'runtimeDirectory' | 'sessionId'
>;

type ExistingInput = { kind: 'existing'; archive: boolean };

const createAcpSessionDependencies = (
  context: OpenSessionsInput,
): AcpSessionDependencies => ({
  resources: context.acpResources,
  installedAgents: context.installedAgents,
});

const createSessionCreationInput = (
  event: Extract<OpenSessionsCommand, { type: 'sessions.create' }>,
): CreationInput => ({
  kind: 'new',
  projectId: event.projectId,
  projectPath: event.projectPath,
  agent: event.agent,
  checkout: event.checkout,
  configOptions: event.configOptions,
  prompt: event.prompt,
  turnId: event.turnId,
  startedBySessionId: event.startedBySessionId,
});

const sessionInput = (event: OpenSession): CreationInput | ExistingInput =>
  event.type === 'sessions.create'
    ? createSessionCreationInput(event)
    : { kind: 'existing', archive: event.type === 'sessions.archive' };

export const createSessionActorInput = ({
  context,
  event,
}: SessionSource): SessionMachineInput => ({
  database: context.database,
  runtimeDirectory: context.runtimeDirectory,
  now: context.now,
  createId: context.createId,
  acp: createAcpSessionDependencies(context),
  hooks: context.hooks,
  writer: context.writer,
  sessionId: event.sessionId,
  ...sessionInput(event),
});
