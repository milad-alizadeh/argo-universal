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
  agent: AgentInput;
  parent: ActorRef<Snapshot<unknown>, ConnectionEvent>;
}

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function runCommand(connection: AgentConnection, command: AgentCommand) {
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
    case 'agent.stop':
      return connection.stop();
  }
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
          const {
            agent: id,
            sessionId,
            cwd,
            vendorSessionId,
            configOptions,
          } = input.agent;
          const connectInput = {
            sessionId,
            cwd,
            vendorSessionId,
            configOptions,
          };
          const send = (event: ConnectionEvent) => input.parent.send(event);
          const adapter = adapterFor(id);
          let stopped = false;
          const connecting = adapter
            ? adapter.connect(connectInput, {
                message: (message) =>
                  send({ type: 'connection.message', message }),
                event: (event) =>
                  send({ type: 'connection.events', events: [event] }),
                failed: (error) => send({ type: 'connection.failed', error }),
              })
            : Promise.reject(new Error(`No Agent adapter for ${id}.`));
          const fail = (error: unknown) =>
            send({ type: 'connection.failed', error: describeError(error) });
          connecting.then(
            (connection) =>
              send({ type: 'connection.ready', ready: connection.ready }),
            (error: unknown) => {
              if (!stopped) fail(error);
            },
          );

          // Commands run in order, so a config change lands before the prompt that follows it.
          let commands = Promise.resolve();
          receive((command) => {
            if (command.type === 'agent.stop') stopped = true;
            commands = commands
              .then(async () => {
                if (command.type !== 'agent.stop')
                  return runCommand(await connecting, command);
                await (await connecting.catch(() => null))?.stop();
                send({ type: 'connection.closed' });
              })
              .catch(fail);
          });
          return () => {
            if (stopped) return;
            stopped = true;
            connecting.then((connection) => connection.stop()).catch(() => {});
          };
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
      input: ({ context, self }) => ({ agent: context, parent: self }),
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
