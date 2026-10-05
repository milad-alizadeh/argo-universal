import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  type Actor,
  createActor,
  type EventFromLogic,
  fromCallback,
  type SnapshotFrom,
} from 'xstate';
import { adjacencyMapToArray, getAdjacencyMap, TestModel } from 'xstate/graph';
import type { AgentCommand, AgentEvent, AgentInput } from '../src/agent-events';
import {
  claudeCapabilities,
  claudeMachine,
  type VendorSessionActorInput,
} from './machine';
import type { VendorCommand, VendorEvent } from './vendor-session';

let received: AgentEvent[];
let commands: VendorCommand[];
let sessionInputs: unknown[];
let sendVendorEvent: (event: VendorEvent) => void;
let parent: AgentInput['parent'];
let agent: Actor<typeof machine>;

const machine = claudeMachine.provide({
  actors: {
    vendorSession: fromCallback<VendorCommand, VendorSessionActorInput>(
      ({ input, receive }) => {
        sessionInputs.push(input.agent);
        sendVendorEvent = (event) => input.parent.send(event);
        receive((command) => commands.push(command));
      },
    ),
  },
});
type ClaudeSnapshot = SnapshotFrom<typeof machine>;
type ClaudeEvent = EventFromLogic<typeof machine>;

const input = (): AgentInput => ({
  sessionId: 'session-1',
  cwd: '/project',
  vendorSessionId: null,
  configOptions: [{ configId: 'model', value: 'haiku' }],
  parent,
});

beforeEach(() => {
  received = [];
  commands = [];
  sessionInputs = [];
  parent = createActor(
    fromCallback<AgentEvent>(({ receive }) => {
      receive((event) => received.push(event));
    }),
  ).start();
});
afterEach(() => {
  agent?.stop();
  parent.stop();
});

const configOptions = [
  {
    type: 'select' as const,
    configId: 'model',
    name: 'Model',
    category: 'model' as const,
    currentValue: 'haiku',
    options: [{ value: 'haiku', name: 'Haiku' }],
  },
];
const connected: VendorEvent = {
  type: 'vendor.connected',
  vendorSessionId: 'vendor-1',
  runId: 'run-1',
  configOptions,
};
const answer = {
  type: 'assistant',
  message: { id: 'message-1', content: [{ type: 'text', text: 'Done.' }] },
};
const result = {
  type: 'result',
  subtype: 'success',
  is_error: false,
  stop_reason: 'end_turn',
  usage: { input_tokens: 1, output_tokens: 2 },
};
const usage = { used: 10, size: 100 };

const events: ClaudeEvent[] = [
  {
    type: 'agent.prompt',
    turnId: 'turn-1',
    content: [{ type: 'text', text: 'Go.' }],
  },
  { type: 'agent.cancel' },
  { type: 'agent.setConfigOption', configId: 'model', value: 'haiku' },
  { type: 'agent.stop' },
  connected,
  { type: 'vendor.message', message: answer },
  { type: 'vendor.message', message: result },
  { type: 'vendor.usage', usage },
  { type: 'vendor.configOptionsChanged', configOptions },
  { type: 'vendor.closed' },
  { type: 'vendor.failed', error: 'The CLI exited.' },
];

// What the parent hears for each vendor event, given the mapping so far.
const expectedEvents = (event: ClaudeEvent): AgentEvent[] => {
  switch (event.type) {
    case 'vendor.connected':
      return [
        {
          type: 'agent.ready',
          vendorSessionId: 'vendor-1',
          configOptions,
          capabilities: claudeCapabilities,
          continuedOutside: false,
        },
      ];
    case 'vendor.message':
      return event.message === result
        ? [
            {
              type: 'agent.turnEnded',
              stopReason: 'end_turn',
              usage: {
                totalTokens: 3,
                inputTokens: 1,
                outputTokens: 2,
                cachedReadTokens: 0,
                cachedWriteTokens: 0,
              },
            },
          ]
        : [
            expect.objectContaining({
              type: 'agent.feed',
              change: expect.objectContaining({ type: 'upsert' }),
            }),
          ];
    case 'vendor.usage':
      return [{ type: 'agent.usage', usage }];
    case 'vendor.configOptionsChanged':
      return [{ type: 'agent.configOptionsChanged', configOptions }];
    default:
      return [];
  }
};

const eventKey = (event: ClaudeEvent) =>
  event.type === 'vendor.message'
    ? `${event.type}:${event.message === result ? 'result' : 'answer'}`
    : event.type;

const model = new TestModel(machine, {
  input: { ...input(), parent: {} as AgentInput['parent'] },
  events,
  filterEvents: (snapshot, event) =>
    snapshot.status === 'active' && snapshot.can(event),
  // Include the incoming edge so shortest paths also visit every self-transition.
  serializeState: (snapshot, event, previous) =>
    JSON.stringify({
      value: snapshot.value,
      failure: snapshot.context.failure,
      via: event && `${JSON.stringify(previous?.value)} ${eventKey(event)}`,
    }),
});
const paths = model.getShortestPaths();

const executors = Object.fromEntries(
  events.map(({ type }) => [
    type,
    ({ event }: { event: ClaudeEvent }) => {
      const previousCommands = [...commands];
      const previousEvents = [...received];
      if (event.type.startsWith('agent.')) {
        agent.send(event);
        expect(commands).toEqual([...previousCommands, event as AgentCommand]);
      } else {
        sendVendorEvent(event as VendorEvent);
        expect(received).toEqual([
          ...previousEvents,
          ...(agent.getSnapshot().matches('stopping')
            ? []
            : expectedEvents(event)),
        ]);
      }
    },
  ]),
);
executors['xstate.init'] = () => {
  agent = createActor(machine, { input: input() }).start();
  expect(sessionInputs).toEqual([
    {
      sessionId: 'session-1',
      cwd: '/project',
      vendorSessionId: null,
      configOptions: [{ configId: 'model', value: 'haiku' }],
    },
  ]);
};

const expectState = (expected: ClaudeSnapshot) => {
  const actual = agent.getSnapshot();
  expect(actual.value).toEqual(expected.value);
  expect(actual.status).toBe(expected.status);
  expect(actual.output).toEqual(expected.output);
};

describe('Claude adapter model', () => {
  it.each(paths.map((path) => [path.description, path] as const))(
    '%s',
    async (_, path) => {
      await path.test({ events: executors, states: { '*': expectState } });
    },
  );

  it('the generated paths walk every transition', () => {
    const key = (
      from: ClaudeSnapshot,
      event: ClaudeEvent,
      to: ClaudeSnapshot,
    ) =>
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

describe('Claude adapter', () => {
  it('reports the vendor failure as its output', () => {
    agent = createActor(machine, { input: input() }).start();
    sendVendorEvent({ type: 'vendor.failed', error: 'The CLI exited.' });
    expect(agent.getSnapshot().output).toEqual({ failure: 'The CLI exited.' });
  });

  it('ignores commands the adapter does not support yet', () => {
    agent = createActor(machine, { input: input() }).start();
    sendVendorEvent(connected);
    agent.send({ type: 'agent.rename', title: 'Renamed' });
    agent.send({ type: 'agent.stopShell', shellId: 'shell-1' });
    expect(commands).toEqual([]);
    expect(agent.getSnapshot().value).toEqual({ ready: 'idle' });
  });
});
