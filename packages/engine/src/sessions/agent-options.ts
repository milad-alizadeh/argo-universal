import { EventEmitter, on } from 'node:events';
import {
  SessionOpenFailure,
  InitialConfigOption,
  AgentOptionsUpdate,
  SessionConfigOption,
  type SessionAgentOptionsInput,
  type SessionAgentOptionsOutput,
} from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  type AcpSessionDestination,
  type AcpSessionLease,
  cancelledElicitation,
  cancelledPermission,
  requireInstalledAgent,
  sessionOpenError,
} from '../agents';
import { readProjectPath } from '../projects';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import { readAcpConfiguration } from './acp/acp-configuration';
import {
  AgentOptionsJob,
  readAgentConfiguration,
} from './agent-options-storage';
import { configureOptionsSession } from './configure-options-session';
import type { SessionRouterDeps } from './router-deps';
import { validateSessionCommandAdmission } from './session-command';
import { readSessionRow } from './session-record';

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
  | 'database'
  | 'installedAgents'
  | 'sessions'
  | 'sessionCommandSignal'
  | 'findWriter'
>;

type Discovery = {
  signal: AbortSignal;
  progress: (stage: 'installing' | 'loading', fraction?: number) => void;
};

const DiscoveryEvent = z.union([
  z.object({ update: AgentOptionsUpdate }),
  z.object({ error: z.unknown() }),
]);

type DiscoveryEvents = EventEmitter<{
  update: [z.infer<typeof DiscoveryEvent>];
  done: [];
}>;

function availableWriter(
  deps: OptionsDeps,
): NonNullable<ReturnType<OptionsDeps['findWriter']>> {
  const writer = deps.findWriter();

  if (!writer)
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Server storage is unavailable.',
    });

  return writer;
}

// Discovery uses the same sign-in and failure contract as Send (ADR-0004).
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
  { signal, progress }: Discovery,
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
      destination: optionsDestination,
      signal,
    });
  } catch (cause) {
    throw signal.aborted ? cause : agentFailure(cause);
  }
}

// Discover in the Project folder and commit before publishing the refreshed snapshot.
async function refreshAgentOptions(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  discovery: Discovery,
): Promise<SessionAgentOptionsOutput> {
  requireInstalledAgent(deps.installedAgents, input.agent);
  const writer = availableWriter(deps);

  const saved = readAgentConfiguration(
    { database: deps.database, writer },
    input,
  );

  const lease = await openOptionsSession(deps, input, discovery);

  try {
    const options = await configureOptionsSession(
      lease,
      readAcpConfiguration(lease.response.configOptions, rejections),
      {
        saved: saved?.configOptions ?? [],
        picks: input.picks ?? {},
        signal: discovery.signal,
      },
    );

    if (input.sessionId && saved) return options;
    await writeDatabaseJobAndWaitForCommit(
      writer,
      new AgentOptionsJob(
        { agent: input.agent, projectId: input.projectId },
        options,
        { authoritative: true, expectedRevision: saved?.revision ?? 0 },
      ),
    );

    return (
      readAgentConfiguration({ database: deps.database, writer }, input)
        ?.configOptions ?? options
    );
  } finally {
    await lease.close();
  }
}

// One endpoint sends the durable snapshot first, then refreshes without hiding it.
export async function* agentOptionsUpdates(
  deps: OptionsDeps,
  request: SessionAgentOptionsInput,
  signal?: AbortSignal,
): AsyncGenerator<AgentOptionsUpdate, void> {
  const input = sessionOptionsInput(deps, request);
  requireInstalledAgent(deps.installedAgents, input.agent);

  const saved = readAgentConfiguration(
    { database: deps.database, writer: deps.findWriter() },
    input,
  );

  const owner = { agent: input.agent, projectId: input.projectId };
  yield {
    ...owner,
    configOptions: saved
      ? saved.configOptions.map((option) => {
          const value = input.picks?.[option.configId];

          return typeof value === typeof option.currentValue
            ? SessionConfigOption.parse({ ...option, currentValue: value })
            : option;
        })
      : null,
  };
  // The reader retains this snapshot even if discovery asks for sign-in or fails.
  yield* discoveryUpdates(deps, input, {
    cached: saved?.configOptions ?? null,
    signal,
  });
}

/*
 * Browsing keeps the Session closed. Discover using its own saved choices, not
 * whichever choices another Session most recently wrote for this Agent.
 */
function sessionOptionsInput(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
): SessionAgentOptionsInput {
  if (!input.sessionId) return input;

  const session = readSessionRow(
    { database: deps.database, writer: deps.findWriter() },
    input.sessionId,
  );

  if (
    !session ||
    session.agent !== input.agent ||
    session.projectId !== input.projectId
  )
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Session not found for this Agent and Project.',
    });

  return {
    ...input,
    picks: Object.fromEntries(
      [
        ...InitialConfigOption.array().parse(session.configValues),
        ...InitialConfigOption.array().parse(session.heldConfig),
      ].map(({ configId, value }) => [configId, value]),
    ),
  };
}

// Buffer progress while discovery runs; cancellation stops this reader and its discovery.
async function* discoveryUpdates(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  {
    cached,
    signal,
  }: { cached: SessionAgentOptionsOutput | null; signal?: AbortSignal },
): AsyncGenerator<AgentOptionsUpdate> {
  const controller = new AbortController();

  const active = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  const events: DiscoveryEvents = new EventEmitter();
  const stream = on(events, 'update', { signal: active, close: ['done'] });

  const work = publishDiscovery(deps, input, {
    events,
    cached,
    signal: active,
  });

  try {
    yield* readDiscovery(stream);
  } finally {
    controller.abort();
    await stream.return?.();
    await work;
  }
}

async function* readDiscovery(
  stream: ReturnType<typeof on>,
): AsyncGenerator<AgentOptionsUpdate> {
  for await (const [event] of stream) {
    const value = DiscoveryEvent.parse(event);

    if ('error' in value) throw value.error;
    yield value.update;
  }
}

function publishDiscovery(
  deps: OptionsDeps,
  input: SessionAgentOptionsInput,
  {
    events,
    cached,
    signal,
  }: {
    events: DiscoveryEvents;
    cached: SessionAgentOptionsOutput | null;
    signal: AbortSignal;
  },
): Promise<boolean> {
  const owner = { agent: input.agent, projectId: input.projectId };

  return refreshAgentOptions(deps, input, {
    signal,
    progress: (stage, progress) =>
      events.emit('update', {
        update: { ...owner, configOptions: cached, stage, progress },
      }),
  })
    .then(
      (configOptions) =>
        events.emit('update', {
          update: { ...owner, configOptions, stage: 'ready' },
        }),
      (error) => events.emit('update', { error }),
    )
    .finally(() => events.emit('done'));
}
