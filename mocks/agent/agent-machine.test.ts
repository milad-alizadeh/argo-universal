import {
  type AgentCommand,
  type AgentConnectInput,
  type AgentEvent,
  type AgentInput,
  type AgentReady,
  agentMachine,
  findAgentAdapter,
} from '@repo/agents';
import { unwalkedTransitions } from '@repo/vitest/model-coverage';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Actor,
  type AnyEventObject,
  createActor,
  type EventFromLogic,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import { TestModel } from 'xstate/graph';
import {
  createMockAdapter,
  type MockAgentStream,
  type MockAgentStreamEvent,
} from './adapter';

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
  connect: (connectInput) => {
    inputs.push(connectInput);
    return connection.promise;
  },
  stream: (connectedStream) => {
    stream = connectedStream;
    stream.receive((command) => commands.push(command));
    return () => {
      cleanups += 1;
    };
  },
  stop: () => {
    shutdowns += 1;
    return shutdown.promise;
  },
});
type AgentSnapshot = SnapshotFrom<typeof agentMachine>;
type AgentMachineEvent = EventFromLogic<typeof agentMachine>;

const start = () => {
  agent = createActor(agentMachine, { input }).start();
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
  connection = Promise.withResolvers();
  shutdown = Promise.withResolvers();
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
    adapter,
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

// Vendor events drive the graph; the executors produce each one through the scripted adapter.
const events = [
  ...commandExamples,
  { ...planAnswer, turnId: undefined },
  { type: 'agent.stop' },
  { type: 'vendor.event', event: { type: 'agent.turnStarted' } },
  {
    type: 'vendor.event',
    event: { type: 'agent.turnEnded', stopReason: 'end_turn' },
  },
  { type: 'vendor.event', event: feed },
  { type: 'vendor.ready', ready },
  {
    type: 'vendor.ready',
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
  { type: 'xstate.error.actor.vendorSession', error: failure },
] as AnyEventObject[] as AgentMachineEvent[];

const eventKey = (event: AgentMachineEvent) => {
  if (event.type === 'vendor.event') return `${event.type}:${event.event.type}`;
  if (event.type === 'agent.answerPlanProposal')
    return `${event.type}:${!!event.turnId}`;
  return event.type;
};
const model = new TestModel(agentMachine, {
  input: {
    adapter,
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
      planApproval: snapshot.context.capabilities?.planApproval,
      failure: snapshot.context.failure,
      via: event && `${JSON.stringify(previous?.value)} ${eventKey(event)}`,
    }),
});
const paths = model.getShortestPaths();
const executors = Object.fromEntries(
  events.map(({ type }) => [
    type,
    async ({ event }: { event: AgentMachineEvent }) => {
      const state = agent.getSnapshot();
      if (event.type.startsWith('agent.')) {
        const command = event as AgentCommand;
        const previousCommands = [...commands];
        agent.send(command);
        await settle();
        if (command.type !== 'agent.stop')
          expect(commands).toEqual([...previousCommands, command]);
      } else if (event.type === 'vendor.event') {
        const previousEvents = [...received];
        stream.send(event.event as MockAgentStreamEvent);
        expect(received).toEqual([...previousEvents, event.event]);
      } else if (event.type === 'vendor.ready') {
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
      } else {
        // A callback error is modelled here; the example below exercises a real throw.
        agent.send(event);
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
  if (actual.matches('stopped')) expect(shutdowns).toBe(1);
};

describe('Agent machine model', () => {
  it.each(paths.map((path) => [path.description, path] as const))(
    '%s',
    async (_, path) => {
      await path.test({ events: executors, states: { '*': expectState } });
    },
  );

  it('the generated paths walk every transition', () => {
    expect(
      unwalkedTransitions({
        models: [model],
        paths,
        stateKey: (snapshot) => JSON.stringify(snapshot.value),
        eventKey: eventKey,
      }),
    ).toEqual([]);
  });
});

describe('Agent machine', () => {
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
    expect(inputs).toEqual([
      {
        sessionId: 'session-1',
        cwd: '/project',
        vendorSessionId: 'existing-vendor-session',
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
    await settle();
    expect(commands).toEqual([prompt, { type: 'agent.cancel' }]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'turn' });
    expect(received).toEqual([readyEvent]);
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
    expect(received).toEqual([readyEvent, ...changes]);
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
    input.adapter = createMockAdapter({
      connect: async () => ready,
      stream: () => {
        throw new Error('stream unavailable');
      },
    });
    agent = createActor(agentMachine, { input });
    const errors: unknown[] = [];
    agent.subscribe({ error: (error) => errors.push(error) });
    agent.start();
    await settle();
    expect(agent.getSnapshot().value).toBe('failed');
    expect(agent.getSnapshot().output).toEqual({
      failure: 'stream unavailable',
    });
    expect(errors).toEqual([]);
  });

  it('cleans up the stream before shutdown and ignores its late events', async () => {
    start();
    await connect();
    agent.send({ type: 'agent.stop' });
    await settle();
    expect(cleanups).toBe(1);
    expect(agent.getSnapshot().value).toBe('stopping');
    stream.send(feed);
    expect(received).toEqual([readyEvent]);
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

  it('aborts a connection that has not become ready', async () => {
    let connectionSignal: AbortSignal | undefined;
    input.adapter = {
      ...adapter,
      connect: async (_, listener, signal) => {
        connectionSignal = signal;
        return new Promise((_, reject) => {
          signal.addEventListener(
            'abort',
            () => {
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
    agent.send({ type: 'agent.stop' });
    await settle();
    expect(connectionSignal?.aborted).toBe(true);
    expect(received).toEqual([]);
    expect(agent.getSnapshot().value).toBe('stopped');
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('stops a blocked prompt before queued controls can run', async () => {
    input.adapter = {
      ...adapter,
      connect: async (_, listener, signal) => ({
        ready,
        run: async (command) => {
          commands.push(command);
          if (command.type !== 'agent.prompt') return;
          listener.event({ type: 'agent.turnStarted' });
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(signal.reason), {
              once: true,
            });
          });
        },
        stop: async () => {
          shutdowns += 1;
        },
      }),
    };
    start();
    await settle();
    agent.send(prompt);
    await settle();
    agent.send({
      type: 'agent.setConfigOption',
      configId: 'model',
      value: 'careful',
    });
    agent.send({ type: 'agent.stop' });
    await settle();
    expect(commands).toEqual([prompt]);
    expect(shutdowns).toBe(1);
    expect(agent.getSnapshot().value).toBe('stopped');
    expect(agent.getSnapshot().output).toEqual({ failure: null });
  });

  it('fails when no adapter is registered for the Agent', async () => {
    input.adapter = findAgentAdapter('unknown', []);
    start();
    await settle();
    expect(agent.getSnapshot().value).toBe('failed');
    expect(agent.getSnapshot().output).toEqual({
      failure: 'No Agent adapter for unknown.',
    });
  });

  it('runs commands in order, after the connection is ready', async () => {
    start();
    await connect();
    const setConfig: AgentCommand = {
      type: 'agent.setConfigOption',
      configId: 'model',
      value: 'careful',
    };
    agent.send(setConfig);
    agent.send(prompt);
    await settle();
    expect(commands).toEqual([setConfig, prompt]);
  });

  it('cancels a pending prompt after its earlier config and before its later controls', async () => {
    const configured = Promise.withResolvers<void>();
    const responded = Promise.withResolvers<void>();
    const setConfig: AgentCommand = {
      type: 'agent.setConfigOption',
      configId: 'model',
      value: 'careful',
    };
    const rename: AgentCommand = { type: 'agent.rename', title: 'Next title' };
    input.adapter = {
      ...adapter,
      connect: async () => ({
        ready,
        run: async (command) => {
          commands.push(command);
          if (command.type === 'agent.setConfigOption')
            await configured.promise;
          if (command.type === 'agent.prompt') await responded.promise;
        },
        stop: async () => {},
      }),
    };
    start();
    await settle();
    agent.send(setConfig);
    agent.send(prompt);
    agent.send(rename);
    agent.send({ type: 'agent.cancel' });
    await settle();
    expect(commands).toEqual([setConfig]);
    configured.resolve();
    await settle();
    expect(commands).toEqual([setConfig, prompt, { type: 'agent.cancel' }]);
    responded.resolve();
    await settle();
    expect(commands).toEqual([
      setConfig,
      prompt,
      { type: 'agent.cancel' },
      rename,
    ]);
  });
});
