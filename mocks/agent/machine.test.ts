import type {
  AgentAdapter,
  AgentCommand,
  AgentEvent,
  AgentInput,
  AgentOutput,
} from '@repo/agents';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  fromPromise,
  type SnapshotFrom,
  setup,
} from 'xstate';
import { adjacencyMapToArray, getAdjacencyMap, TestModel } from 'xstate/graph';
import {
  createMockAgentMachine,
  type MockAgentReady,
  type MockAgentStream,
  type MockAgentStreamEvent,
} from './machine';

const ready: MockAgentReady = {
  type: 'agent.ready',
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
  capabilities: { planApproval: 'continueTurn', stopShell: true },
  continuedOutside: false,
};
const failure = new Error('process exited');
const deferred = <Value>() => {
  const { promise, resolve, reject } = Promise.withResolvers<Value>();
  return { promise, resolve, reject };
};

let connection: ReturnType<typeof deferred<MockAgentReady>>;
let shutdown: ReturnType<typeof deferred<void>>;
let stream: MockAgentStream;
let received: AgentEvent[];
let commands: AgentCommand[];
let inputs: AgentInput[];
let cleanups: number;
let shutdowns: number;
let parent: AgentInput['parent'];
let input: AgentInput;
let agent: Actor<typeof machine>;
const machine = createMockAgentMachine({
  connect: async () => ready,
  stream: (connectedStream) => {
    stream = connectedStream;
    stream.receive((command) => commands.push(command));
    return () => {
      cleanups += 1;
    };
  },
  stop: async () => {},
}).provide({
  actors: {
    connect: fromPromise<MockAgentReady, AgentInput>(({ input }) => {
      inputs.push(input);
      return connection.promise;
    }),
    stop: fromPromise<void, AgentInput>(({ input }) => {
      inputs.push(input);
      shutdowns += 1;
      return shutdown.promise;
    }),
  },
});
type AgentSnapshot = SnapshotFrom<typeof machine>;
type MockEvent = EventFromLogic<typeof machine>;

const adapter: AgentAdapter<typeof machine> = {
  agent: 'mock',
  capabilities: ready.capabilities,
  machine,
};
const start = () => {
  agent = createActor(adapter.machine, { input }).start();
};
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};
const connect = async (result = ready) => {
  connection.resolve(result);
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
  connection = deferred();
  shutdown = deferred();
  received = [];
  commands = [];
  inputs = [];
  cleanups = 0;
  shutdowns = 0;
  parent = createActor(
    fromCallback<AgentEvent>(({ receive }) => {
      receive((event) => received.push(event));
    }),
  ).start();
  input = {
    sessionId: 'session-1',
    cwd: '/project',
    vendorSessionId: null,
    configOptions: [{ configId: 'model', value: 'fast' }],
    parent,
  };
});
afterEach(() => {
  agent?.stop();
  parent.stop();
  vi.useRealTimers();
});

const prompt: AgentCommand = {
  type: 'agent.prompt',
  turnId: 'turn-1',
  content: [{ type: 'text', text: 'Read the project' }],
};
const permissionAnswer: AgentCommand = {
  type: 'agent.answerPermission',
  toolCallId: 'tool-1',
  optionId: 'reject',
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
  { type: 'agent.cancel' },
  permissionAnswer,
  elicitationAnswer,
  { type: 'agent.setConfigOption', configId: 'model', value: 'careful' },
  planAnswer,
  { type: 'agent.rename', title: 'Read project' },
  { type: 'agent.stopShell', shellId: 'shell-1' },
];
const feed: MockAgentStreamEvent = {
  type: 'agent.feed',
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

// Actor completion/error events drive the graph; the executors settle the scripted I/O.
const events = [
  ...commandExamples,
  { ...planAnswer, turnId: undefined },
  { type: 'agent.stop' },
  { type: 'mock.event', event: { type: 'agent.turnStarted' } },
  {
    type: 'mock.event',
    event: { type: 'agent.turnEnded', stopReason: 'end_turn' },
  },
  { type: 'mock.event', event: feed },
  { type: 'mock.failed', error: failure },
  { type: 'xstate.done.actor.connect', output: ready },
  {
    type: 'xstate.done.actor.connect',
    output: {
      ...ready,
      capabilities: { planApproval: 'startTurn', stopShell: false },
    },
  },
  { type: 'xstate.error.actor.connect', error: failure },
  { type: 'xstate.error.actor.vendorStream', error: failure },
  { type: 'xstate.done.actor.stop' },
  { type: 'xstate.error.actor.stop', error: failure },
] as AnyEventObject[] as MockEvent[];

const eventKey = (event: MockEvent) => {
  if (event.type === 'mock.event') return `${event.type}:${event.event.type}`;
  if (event.type === 'agent.answerPlanProposal')
    return `${event.type}:${!!event.turnId}`;
  return event.type;
};
const model = new TestModel(machine, {
  input: {
    sessionId: 'model',
    cwd: '/project',
    vendorSessionId: null,
    configOptions: [],
    parent: {} as AgentInput['parent'],
  },
  events,
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' && snapshot.can(event),
  // Include the incoming edge so shortest paths also visit every self-transition.
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      planApproval: snapshot.context.ready?.capabilities.planApproval,
      failure: snapshot.context.failure,
      via: event && `${JSON.stringify(previous?.value)} ${eventKey(event)}`,
    }),
});
const paths = model.getShortestPaths();
const executors = Object.fromEntries(
  events.map(({ type }) => [
    type,
    async ({ event }: { event: MockEvent }) => {
      if (event.type.startsWith('agent.')) {
        const command = event as AgentCommand;
        const previousCommands = [...commands];
        agent.send(command);
        if (command.type === 'agent.stop') {
          expect(shutdowns).toBe(1);
          expect(commands).toEqual(previousCommands);
        } else {
          expect(commands).toEqual([...previousCommands, command]);
        }
      } else if (event.type === 'mock.event') {
        const previousEvents = [...received];
        stream.send(event.event);
        expect(received).toEqual([...previousEvents, event.event]);
      } else if (event.type === 'mock.failed') {
        stream.fail(event.error);
      } else {
        const actorEvent = event as AnyEventObject;
        if (actorEvent.type === 'xstate.done.actor.connect') {
          await connect(actorEvent.output as MockAgentReady);
          expect(received).toEqual([actorEvent.output]);
        } else if (actorEvent.type === 'xstate.error.actor.connect') {
          connection.reject(failure);
          await settle();
        } else if (actorEvent.type === 'xstate.done.actor.stop') {
          shutdown.resolve();
          await settle();
        } else if (actorEvent.type === 'xstate.error.actor.stop') {
          shutdown.reject(failure);
          await settle();
        } else {
          // A callback error is modelled here; the example below exercises a real throw.
          agent.send(event);
        }
      }
    },
  ]),
);
executors['xstate.init'] = async () => {
  start();
};

const expectState = (expected: AgentSnapshot) => {
  const actual = agent.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.output).toEqual(expected.output);
  expect(actual.context.failure).toBe(expected.context.failure);
  if (actual.matches('stopping') || actual.matches('stopped'))
    expect(shutdowns).toBe(1);
};

describe('mock agent model', () => {
  it.each(paths.map((path) => [path.description, path] as const))(
    '%s',
    async (_, path) => {
      await path.test({ events: executors, states: { '*': expectState } });
    },
  );

  it('the generated paths walk every transition', () => {
    const key = (from: AgentSnapshot, event: MockEvent, to: AgentSnapshot) =>
      `${JSON.stringify(from.value)} ${eventKey(event)} ${JSON.stringify(to.value)}`;
    const transitions = adjacencyMapToArray(
      getAdjacencyMap(machine, model.options),
    ).map(({ state, event, nextState }) => key(state, event, nextState));
    const walked = new Set(
      paths.flatMap((path) =>
        path.steps
          .slice(1)
          .map((step, index) =>
            key(
              path.steps[index]?.state ?? expect.unreachable(),
              step.event,
              step.state,
            ),
          ),
      ),
    );
    expect(transitions.length).toBeGreaterThan(0);
    expect(transitions.filter((transition) => !walked.has(transition))).toEqual(
      [],
    );
  });
});

describe('mock agent', () => {
  it('refuses stopping a Shell when the adapter lacks that capability', async () => {
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

  it('reports a resumed connection and continued terminal activity without starting a Turn', async () => {
    input.vendorSessionId = 'existing-vendor-session';
    start();
    expect(agent.getSnapshot().value).toBe('starting');
    expect(agent.getSnapshot().can(prompt)).toBe(false);
    expect(inputs[0]).toMatchObject(input);
    await connect({
      ...ready,
      vendorSessionId: input.vendorSessionId,
      continuedOutside: true,
    });
    expect(received).toEqual([
      {
        ...ready,
        vendorSessionId: 'existing-vendor-session',
        continuedOutside: true,
      },
    ]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    expect(commands).toEqual([]);
  });

  it('keeps a cancelled Turn running until the scripted Agent ends it', async () => {
    start();
    await connect();
    agent.send(prompt);
    expect(agent.getSnapshot().can(prompt)).toBe(false);
    agent.send(prompt);
    agent.send({ type: 'agent.cancel' });
    expect(commands).toEqual([prompt, { type: 'agent.cancel' }]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'turn' });
    expect(received).toEqual([ready]);
    stream.send({ type: 'agent.turnEnded', stopReason: 'cancelled' });
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    expect(cleanups).toBe(0);
  });

  it('forwards streamed requests, Feed changes, and background work in order', async () => {
    start();
    await connect();
    agent.send(prompt);
    const changes: MockAgentStreamEvent[] = [
      feed,
      {
        type: 'agent.feed',
        change: {
          type: 'append',
          id: 'message-1',
          field: 'content.0.text',
          text: ' files',
        },
      },
      {
        type: 'agent.feed',
        change: { type: 'patch', id: 'message-1', set: { state: 'settled' } },
      },
      {
        type: 'agent.permissionRequested',
        request: {
          toolCallId: 'tool-1',
          title: 'Write file',
          options: [
            { optionId: 'allow', name: 'Allow once', kind: 'allow_once' },
            { optionId: 'reject', name: 'Deny', kind: 'reject_once' },
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
      { type: 'agent.usage', usage: { used: 100, size: 2000 } },
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
      { type: 'agent.shellOutput', shellId: 'shell-1', text: 'Listening' },
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
        type: 'agent.turnEnded',
        stopReason: 'end_turn',
        usage: { totalTokens: 15, inputTokens: 10, outputTokens: 5 },
      },
    ];
    for (const change of changes) stream.send(change);
    expect(received).toEqual([ready, ...changes]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
    stream.send({
      type: 'agent.shellOutput',
      shellId: 'shell-1',
      text: 'Still listening',
    });
    expect(received.at(-1)).toEqual({
      type: 'agent.shellOutput',
      shellId: 'shell-1',
      text: 'Still listening',
    });
  });

  it('ends as failed when the stream cannot start', async () => {
    const brokenMachine = createMockAgentMachine({
      connect: async () => ready,
      stream: () => {
        throw new Error('stream unavailable');
      },
      stop: async () => {},
    });
    agent = createActor(brokenMachine, { input });
    const errors: unknown[] = [];
    agent.subscribe({ error: (error) => errors.push(error) });
    agent.start();
    await settle();
    expect(agent.getSnapshot().value).toBe('failed');
    expect(agent.getSnapshot().output).toEqual({
      failure: 'Error: stream unavailable',
    });
    expect(errors).toEqual([]);
  });

  it('cleans up the stream before shutdown and ignores its late events', async () => {
    start();
    await connect();
    agent.send({ type: 'agent.stop' });
    expect(cleanups).toBe(1);
    expect(agent.getSnapshot().value).toBe('stopping');
    stream.send(feed);
    expect(received).toEqual([ready]);
    shutdown.resolve();
    await settle();
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('ignores a connection that resolves after stopping during startup', async () => {
    start();
    agent.send({ type: 'agent.stop' });
    await connect();
    expect(received).toEqual([]);
    expect(agent.getSnapshot().value).toBe('stopping');
    shutdown.resolve();
    await settle();
    expect(agent.getSnapshot().value).toBe('stopped');
  });

  it('rejects an adapter machine that lacks Session commands', () => {
    const incomplete = setup({
      types: {
        input: {} as AgentInput,
        events: {} as { type: 'agent.stop' },
        output: {} as AgentOutput,
      },
    }).createMachine({
      initial: 'idle',
      states: { idle: {} },
      output: { failure: null },
    });
    expectTypeOf<
      AgentAdapter<typeof incomplete>['machine']
    >().toEqualTypeOf<never>();
  });

  it('requires registration to retain the concrete machine type', () => {
    // @ts-expect-error An erased machine type would bypass the boundary checks.
    expectTypeOf<AgentAdapter>();
  });
});
