import {
  type AgentAdapter,
  type AgentCommand,
  type AgentConnectInput,
  type AgentEvent,
  type AgentInput,
  type AgentReady,
  type VendorSession,
  agentMachine,
  findAgentAdapter,
} from '@repo/agents';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { terminalPaths } from '@repo/vitest/model-paths';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  type Actor,
  createActor,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import {
  type StatePath,
  type GraphEventFromLogic,
  getShortestPaths,
  getPathsFromEvents,
  getAdjacencyMap,
} from 'xstate/graph';
import {
  createMockAdapter,
  type MockAgentStream,
  type MockAgentStreamEvent,
} from './adapter';

const agentPromptEvent = 'agent.prompt';
const cancelAgentEvent = 'agent.cancel';
const setAgentConfigOptionEvent = 'agent.setConfigOption';
const agentFeedEvent = 'agent.feed';
const stopAgentEvent = 'agent.stop';
const vendorEvent = 'vendor.event';
const agentTurnEndedEvent = 'agent.turnEnded';
const rejectedAgentMessageEvent = 'agent.messageRejected';
const unknownVendorMessageReason = 'Unknown vendor message';
const vendorReadyEvent = 'vendor.ready';
const agentUsageEvent = 'agent.usage';
const existingVendorSessionId = 'existing-vendor-session';
const agentShellOutputEvent = 'agent.shellOutput';
const vendorSessionErrorEvent = 'xstate.error.actor.vendorSession';
const agentStartDelayEvent = 'xstate.after.agentStartLimit.agent.starting';

const ready: AgentReady = {
  vendorSessionId: 'vendor-session-1',
  configOptions: [
    {
      type: 'select',
      configId: 'model',
      name: 'Model',
      currentValue: 'fast',
      options: [{ value: 'fast', name: 'Fast' }],
    },
  ],
  capabilities: {
    permissionFeedback: true,
    planApproval: 'continueTurn',
    stopShell: true,
  },
  continuedOutside: false,
};
const readyEvent = { type: 'agent.ready', ...ready } as const;
const failure = new Error('process exited');

let connection: PromiseWithResolvers<AgentReady>;
let shutdown: PromiseWithResolvers<void>;
let stream: MockAgentStream;
let received: AgentEvent[];
let commands: AgentCommand[];
let inputs: AgentConnectInput[];
let cleanups: number;
let shutdowns: number;
let parent: AgentInput['parent'];
let input: AgentInput;
let agent: Actor<typeof agentMachine>;
const adapter = createMockAdapter({
  connect: (connectInput): Promise<AgentReady> => {
    inputs.push(connectInput);
    return connection.promise;
  },
  stream: (connectedStream): (() => void) => {
    stream = connectedStream;
    stream.receive((command): number => commands.push(command));
    return (): void => {
      cleanups += 1;
    };
  },
  stop: (): Promise<void> => {
    shutdowns += 1;
    return shutdown.promise;
  },
});
type AgentSnapshot = SnapshotFrom<typeof agentMachine>;

const start = (): void => {
  agent = createActor(agentMachine, { input }).start();
};
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};
const connect = async (result = ready): Promise<void> => {
  connection.resolve(result);
  await settle();
};

beforeEach((): void => {
  vi.useFakeTimers();
  connection = Promise.withResolvers();
  shutdown = Promise.withResolvers();
  received = [];
  commands = [];
  inputs = [];
  cleanups = 0;
  shutdowns = 0;
  parent = createActor(
    fromCallback<AgentEvent>(({ receive }): void => {
      receive((event): number => received.push(event));
    }),
  ).start();
  input = {
    adapter,
    sessionId: 'session-1',
    cwd: '/project',
    vendorSessionId: null,
    configOptions: [{ configId: 'model', value: 'fast' }],
    parent,
  };
});
afterEach((): void => {
  agent?.stop();
  parent.stop();
  vi.useRealTimers();
});

const prompt: AgentCommand = {
  type: agentPromptEvent,
  turnId: 'turn-1',
  content: [{ type: 'text', text: 'Read the project' }],
};
const permissionAnswer: AgentCommand = {
  type: 'agent.answerPermission',
  toolCallId: 'tool-1',
  optionId: 'reject_once' as const,
  message: 'Use a read-only command',
};
const elicitationAnswer: AgentCommand = {
  type: 'agent.answerElicitation',
  action: 'accept',
  content: { branch: 'main' },
};
const planAnswer: AgentCommand = {
  type: 'agent.answerPlanProposal',
  planId: 'plan-1',
  decision: 'approve',
  turnId: 'turn-2',
};
const commandExamples: AgentCommand[] = [
  prompt,
  { type: cancelAgentEvent },
  permissionAnswer,
  elicitationAnswer,
  { type: setAgentConfigOptionEvent, configId: 'model', value: 'careful' },
  planAnswer,
  { type: 'agent.rename', title: 'Read project' },
  { type: 'agent.stopShell', shellId: 'shell-1' },
];
const feed: MockAgentStreamEvent = {
  type: agentFeedEvent,
  subagentToolCallId: 'child-tool-1',
  change: {
    type: 'upsert',
    update: {
      id: 'message-1',
      state: 'open',
      sessionUpdate: 'agent_message',
      messageId: 'vendor-message-1',
      content: [{ type: 'text', text: 'Reading' }],
    },
  },
};

// Vendor events drive the graph; the executors produce each one through the scripted adapter.
const events = [
  ...commandExamples,
  { ...planAnswer, turnId: undefined },
  { type: stopAgentEvent },
  { type: vendorEvent, event: { type: 'agent.turnStarted' } },
  {
    type: vendorEvent,
    event: { type: agentTurnEndedEvent, stopReason: 'end_turn' },
  },
  { type: vendorEvent, event: feed },
  {
    type: vendorEvent,
    event: {
      type: rejectedAgentMessageEvent,
      reason: unknownVendorMessageReason,
    },
  },
  { type: vendorReadyEvent, ready },
  {
    type: vendorReadyEvent,
    ready: {
      ...ready,
      capabilities: {
        permissionFeedback: true,
        planApproval: 'startTurn',
        stopShell: false,
      },
    },
  },
  { type: 'vendor.failed', error: failure.message },
  { type: 'vendor.closed' },
  { type: agentStartDelayEvent },
  { type: vendorSessionErrorEvent, actorId: 'vendorSession', error: failure },
] satisfies GraphEventFromLogic<typeof agentMachine>[];
type AgentMachineEvent = (typeof events)[number];
const isCommand = (
  event: AgentMachineEvent,
): event is Extract<AgentMachineEvent, AgentCommand> =>
  event.type.startsWith('agent.');
const graphParent = createActor(fromCallback<AgentEvent>(() => {})).start();
afterAll((): void => {
  graphParent.stop();
});

const eventKey = (event: AgentMachineEvent): string => {
  if (event.type === vendorEvent) return `${event.type}:${event.event.type}`;
  if (event.type === 'agent.answerPlanProposal')
    return `${event.type}:${!!event.turnId}`;
  return event.type;
};
const canGraphEvent = (
  snapshot: AgentSnapshot,
  event: AgentMachineEvent,
): boolean => {
  switch (event.type) {
    case agentStartDelayEvent:
      return snapshot.matches('starting');
    case vendorSessionErrorEvent:
      return true;
    default:
      return snapshot.can(event);
  }
};
const options = {
  input: {
    adapter,
    sessionId: 'model',
    cwd: '/project',
    vendorSessionId: null,
    configOptions: [],
    parent: graphParent,
  },
  events,
  filterEvents: (snapshot: AgentSnapshot, event: AgentMachineEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Include the incoming edge so shortest paths also visit every self-transition.
  serializeState: (
    snapshot: AgentSnapshot,
    event: AgentMachineEvent | undefined,
    previous?: AgentSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      planApproval: snapshot.context.capabilities?.planApproval,
      failure: snapshot.context.failure,
      via: event && `${JSON.stringify(previous?.value)} ${eventKey(event)}`,
    }),
};
const paths = terminalPaths(getShortestPaths(agentMachine, options));
const executors = Object.fromEntries(
  events.map(
    ({
      type,
    }): [
      AgentMachineEvent['type'],
      ({ event }: { event: AgentMachineEvent }) => Promise<void>,
    ] => [
      type,
      async ({ event }: { event: AgentMachineEvent }): Promise<void> => {
        const state = agent.getSnapshot();
        if (isCommand(event)) {
          const command = event;
          const previousCommands = [...commands];
          agent.send(command);
          await settle();
          if (command.type !== stopAgentEvent)
            expect(commands).toEqual([...previousCommands, command]);
        } else if (event.type === vendorEvent) {
          const previousEvents = [...received];
          stream.send(event.event);
          expect(received).toEqual([...previousEvents, event.event]);
        } else if (event.type === vendorReadyEvent) {
          await connect(event.ready);
          expect(received).toEqual([{ type: 'agent.ready', ...event.ready }]);
        } else if (event.type === 'vendor.failed') {
          if (state.matches('starting')) connection.reject(failure);
          else if (state.matches('stopping')) {
            connection.resolve(ready);
            shutdown.reject(failure);
          } else stream.fail(failure.message);
          await settle();
        } else if (event.type === 'vendor.closed') {
          connection.resolve(ready);
          shutdown.resolve();
          await settle();
        } else if (event.type === agentStartDelayEvent) {
          await vi.advanceTimersByTimeAsync(10_000);
        } else {
          expect.unreachable(
            'Callback errors use graph proof or the actual startup port',
          );
        }
      },
    ],
  ),
);
executors['xstate.init'] = async (): Promise<void> => {
  start();
};

const expectState = (expected: AgentSnapshot): void => {
  const actual = agent.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.output).toEqual(expected.output);
  expect(actual.context.failure).toBe(expected.context.failure);
  if (actual.matches('stopped')) expect(shutdowns).toBe(1);
};

const callbackErrorKind = (
  path: StatePath<AgentSnapshot, AgentMachineEvent>,
): 'startup' | 'late' | null => {
  const index = path.steps.findIndex(
    (step) => step.event.type === vendorSessionErrorEvent,
  );
  if (index < 1) return null;
  return path.steps[index - 1]?.state.matches('starting') ? 'startup' : 'late';
};

describe('Agent machine model', (): void => {
  it.each(
    paths.map(
      (
        path,
      ): [
        string,
        import('xstate/graph').StatePath<AgentSnapshot, AgentMachineEvent>,
      ] =>
        [
          `${callbackErrorKind(path) === 'late' ? 'graph transition' : 'actor replay'}: ${path.steps.map((step) => eventKey(step.event)).join(' → ')}`,
          path,
        ] as const,
    ),
  )('%s', async (_, path): Promise<void> => {
    const errorKind = callbackErrorKind(path);
    if (errorKind === 'late') {
      const [proof] = getPathsFromEvents(
        agentMachine,
        path.steps.slice(1).map((step) => step.event),
        options,
      );
      expect(proof?.state.value).toBe('failed');
      expect(proof?.state.status).toBe('done');
      expect(proof?.state.context.failure).toBe(failure.message);
      expect(proof?.state.output).toEqual({ failure: failure.message });
      return;
    }
    const modelExecutors = { ...executors };
    if (errorKind === 'startup') {
      input.adapter = {
        ...adapter,
        initialMappingState: (): never => {
          throw failure;
        },
      };
      modelExecutors['xstate.init'] = async (): Promise<void> => {
        agent = createActor(agentMachine, { input });
      };
      modelExecutors[vendorSessionErrorEvent] = async (): Promise<void> => {
        agent.start();
        await settle();
      };
    }
    for (const step of path.steps) {
      const execute = modelExecutors[step.event.type];
      if (!execute)
        throw new Error(`Missing Agent executor for ${step.event.type}`);
      await execute(step);
      expectState(step.state);
    }
  });

  it('the generated paths walk every transition', (): void => {
    expect(
      unwalkedTransitions({
        models: [
          {
            getAdjacencyMap: (): ReturnType<
              typeof getAdjacencyMap<typeof agentMachine, AgentMachineEvent>
            > => getAdjacencyMap(agentMachine, options),
          },
        ],
        paths,
        stateKey: (snapshot): string => JSON.stringify(snapshot.value),
        eventKey: eventKey,
      }),
    ).toEqual([]);
  });
});

describe('Agent machine', (): void => {
  it('ends startup with a retryable failure when the Agent does not initialize', async (): Promise<void> => {
    start();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent.getSnapshot().status).toBe('done');
    expect(agent.getSnapshot().output).toEqual({
      failure:
        'Agent startup exceeded agentStartLimit (10000 ms). Retry the Session.',
    });
    expect(received).toEqual([]);
  });

  it('reports a rejected vendor message and maps the next message without losing its mapping state', async (): Promise<void> => {
    const states: { mapped: number }[] = [];
    const nextMessage: MockAgentStreamEvent = {
      type: 'agent.titleChanged',
      title: 'Mapped the next message',
    };
    const messages = createMockAdapter({
      connect: async (): Promise<AgentReady> => ready,
      stream: (stream): undefined => {
        stream.receive((): void => {
          stream.send(feed);
          stream.send({ type: agentUsageEvent, usage: { used: 1, size: 2 } });
          stream.send(nextMessage);
        });
      },
    });
    const rejectingAdapter: AgentAdapter<
      MockAgentStreamEvent,
      { mapped: number }
    > = {
      ...messages,
      initialMappingState: (): { mapped: number } => ({ mapped: 0 }),
      toAgentEvents: (
        message,
        mappingState,
      ): {
        events: Exclude<MockAgentStreamEvent, { type: 'agent.usage' }>[];
        mappingState: { mapped: number };
      } => {
        states.push(mappingState);
        if (message.type === agentUsageEvent)
          throw new Error(unknownVendorMessageReason);
        return {
          events: [message],
          mappingState: { mapped: mappingState.mapped + 1 },
        };
      },
    };
    input.adapter = rejectingAdapter;
    start();
    await settle();
    agent.send(prompt);
    await settle();
    expect(agent.getSnapshot().status).toBe('active');
    expect(agent.getSnapshot().context.failure).toBeNull();
    expect(received).toEqual([
      readyEvent,
      feed,
      { type: rejectedAgentMessageEvent, reason: unknownVendorMessageReason },
      nextMessage,
    ]);
    expect(states).toEqual([{ mapped: 0 }, { mapped: 1 }, { mapped: 1 }]);
  });
  it('reports a rejected startup message after the Agent is ready', async (): Promise<void> => {
    const messages = createMockAdapter({
      connect: async (): Promise<AgentReady> => ready,
      stream: (stream): undefined => {
        stream.send({ type: agentUsageEvent, usage: { used: 1, size: 2 } });
        stream.send(feed);
      },
    });
    const rejectingAdapter: typeof messages = {
      ...messages,
      toAgentEvents: (
        message,
        mappingState,
      ): import('@repo/agents').AgentMapping<null> => {
        if (message.type === agentUsageEvent)
          throw new Error('Unknown startup message');
        return messages.toAgentEvents(message, mappingState);
      },
    };
    input.adapter = rejectingAdapter;
    start();
    await settle();
    expect(agent.getSnapshot().status).toBe('active');
    expect(agent.getSnapshot().context.failure).toBeNull();
    expect(received).toEqual([
      readyEvent,
      { type: rejectedAgentMessageEvent, reason: 'Unknown startup message' },
      feed,
    ]);
  });

  it('refuses stopping a Shell when the adapter lacks that capability', async (): Promise<void> => {
    start();
    await connect({
      ...ready,
      capabilities: { ...ready.capabilities, stopShell: false },
    });
    const command: AgentCommand = {
      type: 'agent.stopShell',
      shellId: 'shell-1',
    };
    expect(agent.getSnapshot().can(command)).toBe(false);
    agent.send(command);
    expect(commands).toEqual([]);
  });

  it('reports a resumed connection and continued terminal activity without starting a Turn', async (): Promise<void> => {
    input.vendorSessionId = existingVendorSessionId;
    start();
    expect(agent.getSnapshot().value).toBe('starting');
    expect(agent.getSnapshot().can(prompt)).toBe(false);
    expect(inputs).toEqual([
      {
        sessionId: 'session-1',
        cwd: '/project',
        vendorSessionId: existingVendorSessionId,
        configOptions: [{ configId: 'model', value: 'fast' }],
      },
    ]);
    await connect({
      ...ready,
      vendorSessionId: input.vendorSessionId,
      continuedOutside: true,
    });
    expect(received).toEqual([
      {
        ...readyEvent,
        vendorSessionId: existingVendorSessionId,
        continuedOutside: true,
      },
    ]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    expect(commands).toEqual([]);
  });

  it('keeps a cancelled Turn running until the scripted Agent ends it', async (): Promise<void> => {
    start();
    await connect();
    agent.send(prompt);
    expect(agent.getSnapshot().can(prompt)).toBe(false);
    agent.send(prompt);
    agent.send({ type: cancelAgentEvent });
    await settle();
    expect(commands).toEqual([prompt, { type: cancelAgentEvent }]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'turn' });
    expect(received).toEqual([readyEvent]);
    stream.send({ type: agentTurnEndedEvent, stopReason: 'cancelled' });
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    expect(cleanups).toBe(0);
  });

  it('forwards streamed requests, Feed changes, and background work in order', async (): Promise<void> => {
    start();
    await connect();
    agent.send(prompt);
    const changes: MockAgentStreamEvent[] = [
      feed,
      {
        type: agentFeedEvent,
        change: {
          type: 'append',
          id: 'message-1',
          field: 'content.0.text',
          text: ' files',
        },
      },
      {
        type: agentFeedEvent,
        change: { type: 'patch', id: 'message-1', set: { state: 'settled' } },
      },
      {
        type: 'agent.permissionRequested',
        request: {
          toolCallId: 'tool-1',
          title: 'Write file',
          options: [
            {
              optionId: 'allow_once' as const,
              name: 'Allow once',
              kind: 'allow_once',
            },
            {
              optionId: 'reject_once' as const,
              name: 'Deny',
              kind: 'reject_once',
            },
          ],
        },
      },
      {
        type: 'agent.elicitationRequested',
        request: {
          mode: 'form',
          message: 'Choose a branch',
          requestedSchema: { properties: { branch: { type: 'string' } } },
        },
      },
      { type: agentUsageEvent, usage: { used: 100, size: 2000 } },
      {
        type: 'agent.configOptionsChanged',
        configOptions: ready.configOptions,
      },
      {
        type: 'agent.planProposed',
        planId: 'plan-1',
        content: 'Read, then edit.',
      },
      { type: 'agent.titleChanged', title: 'Read project' },
      {
        type: 'agent.subagentChanged',
        subagent: {
          toolCallId: 'child-tool-1',
          vendorSessionId: 'child-1',
          prompt: [{ type: 'text', text: 'Read the routing module' }],
          state: 'running',
          turn: { vendorTurnId: 'child-turn-1', startedAt: 100, model: 'fast' },
        },
      },
      {
        type: 'agent.shellChanged',
        shell: {
          id: 'shell-1',
          toolCallId: 'shell-tool-1',
          command: 'dev',
          cwd: '/project',
          status: 'running',
          startedAt: 100,
        },
      },
      { type: agentShellOutputEvent, shellId: 'shell-1', text: 'Listening' },
      {
        type: 'agent.shellChanged',
        shell: {
          id: 'shell-1',
          toolCallId: 'shell-tool-1',
          command: 'dev',
          cwd: '/project',
          status: 'exited',
          startedAt: 100,
          endedAt: 200,
          exitCode: null,
        },
      },
      {
        type: agentTurnEndedEvent,
        stopReason: 'end_turn',
        usage: { totalTokens: 15, inputTokens: 10, outputTokens: 5 },
      },
    ];
    for (const change of changes) stream.send(change);
    expect(received).toEqual([readyEvent, ...changes]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    stream.send({
      type: agentShellOutputEvent,
      shellId: 'shell-1',
      text: 'Still listening',
    });
    expect(received.at(-1)).toEqual({
      type: agentShellOutputEvent,
      shellId: 'shell-1',
      text: 'Still listening',
    });
  });

  it('ends as failed when the stream cannot start', async (): Promise<void> => {
    input.adapter = createMockAdapter({
      connect: async (): Promise<AgentReady> => ready,
      stream: (): never => {
        throw new Error('stream unavailable');
      },
    });
    agent = createActor(agentMachine, { input });
    const errors: unknown[] = [];
    agent.subscribe({ error: (error): number => errors.push(error) });
    agent.start();
    await settle();
    expect(agent.getSnapshot().value).toBe('failed');
    expect(agent.getSnapshot().output).toEqual({
      failure: 'stream unavailable',
    });
    expect(errors).toEqual([]);
  });

  it('cleans up the stream before shutdown and ignores its late events', async (): Promise<void> => {
    start();
    await connect();
    agent.send({ type: stopAgentEvent });
    await settle();
    expect(cleanups).toBe(1);
    expect(agent.getSnapshot().value).toBe('stopping');
    stream.send(feed);
    expect(received).toEqual([readyEvent]);
    shutdown.resolve();
    await settle();
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('ignores a connection that resolves after stopping during startup', async (): Promise<void> => {
    start();
    agent.send({ type: stopAgentEvent });
    await connect();
    expect(received).toEqual([]);
    expect(agent.getSnapshot().value).toBe('stopping');
    shutdown.resolve();
    await settle();
    expect(agent.getSnapshot().value).toBe('stopped');
  });

  it('aborts a connection that has not become ready', async (): Promise<void> => {
    let connectionSignal: AbortSignal | undefined;
    input.adapter = {
      ...adapter,
      connect: async (
        _,
        listener,
        signal,
      ): Promise<import('@repo/agents').VendorSession> => {
        connectionSignal = signal;
        return new Promise((_, reject): void => {
          signal.addEventListener(
            'abort',
            (): void => {
              listener.event(feed);
              listener.failed(signal.reason);
              reject(signal.reason);
            },
            { once: true },
          );
        });
      },
    };
    start();
    agent.send({ type: stopAgentEvent });
    await settle();
    expect(connectionSignal?.aborted).toBe(true);
    expect(received).toEqual([]);
    expect(agent.getSnapshot().value).toBe('stopped');
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('stops a blocked prompt before queued controls can run', async (): Promise<void> => {
    input.adapter = {
      ...adapter,
      connect: async (_, listener, signal): Promise<VendorSession> => ({
        ready,
        run: async (command): Promise<void> => {
          commands.push(command);
          if (command.type !== agentPromptEvent) return;
          listener.event({ type: 'agent.turnStarted' });
          await new Promise((_, reject): void => {
            signal.addEventListener(
              'abort',
              (): void => reject(signal.reason),
              {
                once: true,
              },
            );
          });
        },
        stop: async (): Promise<void> => {
          shutdowns += 1;
        },
      }),
    };
    start();
    await settle();
    agent.send(prompt);
    await settle();
    agent.send({
      type: setAgentConfigOptionEvent,
      configId: 'model',
      value: 'careful',
    });
    agent.send({ type: stopAgentEvent });
    await settle();
    expect(commands).toEqual([prompt]);
    expect(shutdowns).toBe(1);
    expect(agent.getSnapshot().value).toBe('stopped');
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('fails when no adapter is registered for the Agent', async (): Promise<void> => {
    input.adapter = findAgentAdapter('unknown', []);
    start();
    await settle();
    expect(agent.getSnapshot().value).toBe('failed');
    expect(agent.getSnapshot().output).toEqual({
      failure: 'No Agent adapter for unknown.',
    });
  });

  it('runs commands in order, after the connection is ready', async (): Promise<void> => {
    start();
    await connect();
    const setConfig: AgentCommand = {
      type: setAgentConfigOptionEvent,
      configId: 'model',
      value: 'careful',
    };
    agent.send(setConfig);
    agent.send(prompt);
    await settle();
    expect(commands).toEqual([setConfig, prompt]);
  });

  it('cancels a pending prompt after its earlier config and before its later controls', async (): Promise<void> => {
    const configured = Promise.withResolvers<void>();
    const responded = Promise.withResolvers<void>();
    const setConfig: AgentCommand = {
      type: setAgentConfigOptionEvent,
      configId: 'model',
      value: 'careful',
    };
    const rename: AgentCommand = { type: 'agent.rename', title: 'Next title' };
    input.adapter = {
      ...adapter,
      connect: async (): Promise<VendorSession> => ({
        ready,
        run: async (command): Promise<void> => {
          commands.push(command);
          if (command.type === setAgentConfigOptionEvent)
            await configured.promise;
          if (command.type === agentPromptEvent) await responded.promise;
        },
        stop: async (): Promise<void> => {},
      }),
    };
    start();
    await settle();
    agent.send(setConfig);
    agent.send(prompt);
    agent.send(rename);
    agent.send({ type: cancelAgentEvent });
    await settle();
    expect(commands).toEqual([setConfig]);
    configured.resolve();
    await settle();
    expect(commands).toEqual([setConfig, prompt, { type: cancelAgentEvent }]);
    responded.resolve();
    await settle();
    expect(commands).toEqual([
      setConfig,
      prompt,
      { type: cancelAgentEvent },
      rename,
    ]);
  });
});

it('rejects invalid usage before publishing it to the Session', async (): Promise<void> => {
  start();
  await connect();
  stream.send({ type: 'agent.usage', usage: { used: Number.NaN, size: 100 } });
  await settle();
  expect(received).toEqual([
    readyEvent,
    {
      type: 'agent.messageRejected',
      reason: 'Invalid Argo event: agent.usage',
    },
  ]);
});

it('fails startup before accepting invalid ready data', async (): Promise<void> => {
  start();
  agent.send(prompt);
  await connect(
    Object.assign({}, ready, {
      configOptions: [
        Object.assign({}, ready.configOptions[0], { options: null }),
      ],
    }),
  );
  expect(agent.getSnapshot().matches('failed')).toBe(true);
  expect(received).toEqual([]);
  expect(commands).toEqual([]);
  expect(cleanups).toBe(1);
  expect(shutdowns).toBe(1);
});

it('fails callback startup before connecting when adapter initialization throws', (): void => {
  input.adapter = {
    ...adapter,
    initialMappingState: (): never => {
      throw failure;
    },
  };
  start();
  expect(agent.getSnapshot().value).toBe('failed');
  expect(agent.getSnapshot().status).toBe('done');
  expect(agent.getSnapshot().output).toEqual({ failure: failure.message });
  expect(inputs).toEqual([]);
  expect(cleanups).toBe(0);
  expect(shutdowns).toBe(0);
});
