import {
  type ActorRef,
  assertEvent,
  assign,
  enqueueActions,
  fromCallback,
  type Snapshot,
  sendTo,
  setup,
} from 'xstate';
import type {
  AgentAdapter,
  AgentConnectInput,
  AgentConnection,
  AgentReady,
} from './agent-adapter';
import type {
  AgentCommand,
  AgentEvent,
  AgentInput,
  AgentOutput,
} from './agent-events';

type ConnectionEvent =
  | { type: 'connection.ready'; ready: AgentReady }
  | { type: 'connection.message'; message: unknown }
  | { type: 'connection.events'; events: AgentEvent[] }
  | { type: 'connection.failed'; error: string }
  | { type: 'connection.closed' };

interface AgentContext extends AgentInput {
  ready: AgentReady | null;
  mappingState: unknown;
  failure: string | null;
}

interface ConnectionInput {
  agent: AgentInput['agent'];
  adapter: AgentAdapter | undefined;
  connectInput: AgentConnectInput;
  parent: ActorRef<Snapshot<unknown>, ConnectionEvent>;
}

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type SessionCommand = Exclude<AgentCommand, { type: 'agent.stop' }>;

function runCommand(connection: AgentConnection, command: SessionCommand) {
  switch (command.type) {
    case 'agent.prompt':
      return connection.prompt(command);
    case 'agent.cancel':
      return connection.cancel();
    case 'agent.setConfigOption':
      return connection.setConfigOption(command);
    case 'agent.answerPermission':
      return connection.answerPermission?.(command);
    case 'agent.answerElicitation':
      return connection.answerElicitation?.(command);
    case 'agent.answerPlanProposal':
      return connection.answerPlanProposal?.(command);
    case 'agent.rename':
      return connection.rename?.(command);
    case 'agent.stopShell':
      return connection.stopShell?.(command);
  }
}

// Opens the adapter's connection, and reports what happens to it as connection events.
function openConnection({
  agent,
  adapter,
  connectInput,
  parent,
}: ConnectionInput) {
  const send = (event: ConnectionEvent) => parent.send(event);
  const fail = (error: unknown) =>
    send({ type: 'connection.failed', error: describeError(error) });
  let stopping: Promise<void> | undefined;

  const connect = async () => {
    if (!adapter) throw new Error(`No Agent adapter for ${agent}.`);
    return adapter.connect(connectInput, {
      message: (message) => send({ type: 'connection.message', message }),
      event: (event) => send({ type: 'connection.events', events: [event] }),
      failed: (error) => send({ type: 'connection.failed', error }),
    });
  };
  // Resolves to null when connecting fails, after reporting it.
  const connecting = connect().then(
    (connection) => {
      send({ type: 'connection.ready', ready: connection.ready });
      return connection;
    },
    (error: unknown) => {
      if (!stopping) fail(error);
      return null;
    },
  );

  // Stops once, after connecting settles.
  const stop = () => {
    stopping ??= connecting.then((connection) => connection?.stop());
    return stopping;
  };

  const run = async (command: AgentCommand) => {
    try {
      if (command.type === 'agent.stop') {
        await stop();
        send({ type: 'connection.closed' });
        return;
      }
      const connection = await connecting;
      if (connection) await runCommand(connection, command);
    } catch (error) {
      fail(error);
    }
  };

  return { run, stop: () => void stop().catch(() => {}) };
}

// Whether a Turn runs after these events, given whether one ran before them.
function turnRunsAfter(events: AgentEvent[], running: boolean) {
  let runs = running;
  for (const event of events) {
    if (event.type === 'agent.turnStarted') runs = true;
    if (event.type === 'agent.turnEnded') runs = false;
  }
  return runs;
}

// One machine runs every Agent; it finds the adapter by the Session's `agent` id.
export function createAgentMachine(adapters: readonly AgentAdapter[]) {
  const adapterFor = (agent: string) =>
    adapters.find((adapter) => adapter.agent === agent);

  return setup({
    types: {
      input: {} as AgentInput,
      context: {} as AgentContext,
      events: {} as AgentCommand | ConnectionEvent,
      output: {} as AgentOutput,
    },
    actors: {
      connection: fromCallback<AgentCommand, ConnectionInput>(
        ({ input, receive }) => {
          const connection = openConnection(input);
          // Commands run in order, so a config change lands before the prompt that follows it.
          let queue = Promise.resolve();
          receive((command) => {
            queue = queue.then(() => connection.run(command));
          });
          return connection.stop;
        },
      ),
    },
    actions: {
      sendReady: enqueueActions(({ context, event, enqueue }) => {
        assertEvent(event, 'connection.ready');
        enqueue.assign({
          ready: event.ready,
          mappingState: adapterFor(context.agent)?.initialMappingState(),
        });
        enqueue.sendTo(context.parent, {
          type: 'agent.ready',
          ...event.ready,
        } satisfies AgentEvent);
      }),
      mapMessage: enqueueActions(({ context, event, enqueue }) => {
        assertEvent(event, 'connection.message');
        const adapter = adapterFor(context.agent);
        if (!adapter) return;
        const { events, mappingState } = adapter.toAgentEvents(
          event.message,
          context.mappingState,
        );
        enqueue.assign({ mappingState });
        if (events.length > 0)
          enqueue.raise({ type: 'connection.events', events });
      }),
      sendEvents: enqueueActions(({ context, event, enqueue }) => {
        assertEvent(event, 'connection.events');
        for (const agentEvent of event.events)
          enqueue.sendTo(context.parent, agentEvent);
      }),
      sendCommand: sendTo('connection', ({ event }) => {
        assertEvent(event, [
          'agent.prompt',
          'agent.cancel',
          'agent.answerPermission',
          'agent.answerElicitation',
          'agent.setConfigOption',
          'agent.answerPlanProposal',
          'agent.rename',
          'agent.stopShell',
          'agent.stop',
        ]);
        return event;
      }),
      rememberFailure: assign((_, params: { error: unknown }) => ({
        failure: describeError(params.error),
      })),
    },
    guards: {
      canStopShell: ({ context }) =>
        context.ready?.capabilities.stopShell === true,
      proposalStartsTurn: ({ context, event }) =>
        context.ready?.capabilities.planApproval === 'startTurn' &&
        event.type === 'agent.answerPlanProposal' &&
        event.turnId !== undefined,
      startsTurn: ({ event }) =>
        event.type === 'connection.events' &&
        turnRunsAfter(event.events, false),
      endsTurn: ({ event }) =>
        event.type === 'connection.events' &&
        !turnRunsAfter(event.events, true),
    },
  }).createMachine({
    id: 'agent',
    context: ({ input }) => ({
      ...input,
      ready: null,
      mappingState: adapterFor(input.agent)?.initialMappingState(),
      failure: null,
    }),
    output: ({ context }) => ({ failure: context.failure }),
    invoke: {
      id: 'connection',
      src: 'connection',
      input: ({ context, self }) => ({
        agent: context.agent,
        adapter: adapterFor(context.agent),
        connectInput: {
          sessionId: context.sessionId,
          cwd: context.cwd,
          vendorSessionId: context.vendorSessionId,
          configOptions: context.configOptions,
        },
        parent: self,
      }),
      onError: {
        target: '.failed',
        actions: {
          type: 'rememberFailure',
          params: ({ event }) => ({ error: event.error }),
        },
      },
    },
    initial: 'starting',
    on: {
      'agent.stop': { target: '.stopping' },
      'connection.failed': {
        target: '.failed',
        actions: {
          type: 'rememberFailure',
          params: ({ event }) => ({ error: event.error }),
        },
      },
    },
    states: {
      starting: {
        on: { 'connection.ready': { target: 'ready', actions: 'sendReady' } },
      },
      ready: {
        on: {
          'agent.setConfigOption': { actions: 'sendCommand' },
          'agent.rename': { actions: 'sendCommand' },
          'agent.stopShell': { guard: 'canStopShell', actions: 'sendCommand' },
          'connection.message': { actions: 'mapMessage' },
          'connection.events': { actions: 'sendEvents' },
        },
        initial: 'idle',
        states: {
          idle: {
            on: {
              'agent.prompt': { target: 'turn', actions: 'sendCommand' },
              'agent.answerPlanProposal': {
                guard: 'proposalStartsTurn',
                target: 'turn',
                actions: 'sendCommand',
              },
              'connection.events': [
                { guard: 'startsTurn', target: 'turn', actions: 'sendEvents' },
                { actions: 'sendEvents' },
              ],
            },
          },
          turn: {
            on: {
              'agent.cancel': { actions: 'sendCommand' },
              'agent.answerPermission': { actions: 'sendCommand' },
              'agent.answerElicitation': { actions: 'sendCommand' },
              'agent.answerPlanProposal': { actions: 'sendCommand' },
              'connection.events': [
                { guard: 'endsTurn', target: 'idle', actions: 'sendEvents' },
                { actions: 'sendEvents' },
              ],
            },
          },
        },
      },
      stopping: {
        entry: 'sendCommand',
        on: {
          'agent.stop': {},
          'connection.closed': { target: 'stopped' },
        },
      },
      stopped: { type: 'final' },
      failed: { type: 'final' },
    },
  });
}

export type AgentMachine = ReturnType<typeof createAgentMachine>;
