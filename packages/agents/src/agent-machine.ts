import {
  assign,
  enqueueActions,
  forwardTo,
  fromCallback,
  sendTo,
  setup,
} from 'xstate';
import type {
  AgentAdapter,
  AgentConnectInput,
  AgentReady,
  VendorSession,
} from './agent-adapter';
import type {
  AgentCapabilities,
  AgentCommand,
  AgentEvent,
  AgentInput,
  AgentOutput,
} from './agent-events';
import { describeError } from './describe-error';

type VendorEvent =
  | { type: 'vendor.ready'; ready: AgentReady }
  | { type: 'vendor.events'; events: AgentEvent[] }
  | { type: 'vendor.failed'; error: string }
  | { type: 'vendor.closed' };

// The adapter and parent ref are behaviour, so an Agent snapshot is not persistable.
interface AgentContext extends AgentInput {
  capabilities: AgentCapabilities | null;
  failure: string | null;
}

interface VendorSessionInput {
  adapter: AgentAdapter;
  connectInput: AgentConnectInput;
}

type SessionCommand = Exclude<AgentCommand, { type: 'agent.stop' }>;

function runCommand(session: VendorSession, command: SessionCommand) {
  switch (command.type) {
    case 'agent.prompt':
      return session.prompt(command);
    case 'agent.cancel':
      return session.cancel(command);
    case 'agent.setConfigOption':
      return session.setConfigOption(command);
    case 'agent.answerPermission':
      return session.answerPermission?.(command);
    case 'agent.answerElicitation':
      return session.answerElicitation?.(command);
    case 'agent.answerPlanProposal':
      return session.answerPlanProposal?.(command);
    case 'agent.rename':
      return session.rename?.(command);
    case 'agent.stopShell':
      return session.stopShell?.(command);
  }
}

// Starts the adapter's vendor session, maps its messages, and reports both as vendor events.
function startVendorSession(
  { adapter, connectInput }: VendorSessionInput,
  sendBack: (event: VendorEvent) => void,
) {
  const fail = (error: unknown) =>
    sendBack({ type: 'vendor.failed', error: describeError(error) });
  let mappingState = adapter.initialMappingState();
  // Events wait here until the machine has the ready data they depend on.
  let early: AgentEvent[] | null = [];
  let stopping: Promise<void> | undefined;

  const sendEvents = (events: AgentEvent[]) => {
    if (events.length === 0) return;
    if (early) early.push(...events);
    else sendBack({ type: 'vendor.events', events });
  };
  const connect = async () =>
    adapter.connect(connectInput, {
      message: (message) => {
        const mapped = adapter.toAgentEvents(message, mappingState);
        mappingState = mapped.mappingState;
        sendEvents(mapped.events);
      },
      event: (event) => sendEvents([event]),
      failed: (error) => sendBack({ type: 'vendor.failed', error }),
    });
  // Resolves to null when starting fails, after reporting it.
  const starting = connect().then(
    (session) => {
      sendBack({ type: 'vendor.ready', ready: session.ready });
      const events = early ?? [];
      early = null;
      sendEvents(events);
      return session;
    },
    (error: unknown) => {
      if (!stopping) fail(error);
      return null;
    },
  );

  // Stops once, after starting settles.
  const stop = () => {
    stopping ??= starting.then((session) => session?.stop());
    return stopping;
  };

  const run = async (command: AgentCommand) => {
    try {
      if (command.type === 'agent.stop') {
        await stop();
        sendBack({ type: 'vendor.closed' });
        return;
      }
      const session = await starting;
      if (session) await runCommand(session, command);
    } catch (error) {
      fail(error);
    }
  };

  return { run, stop: () => void stop().catch(() => {}) };
}

// The type of the last Turn boundary among these events, if any.
const lastTurnBoundary = (events: AgentEvent[]) =>
  events.findLast(
    (event) =>
      event.type === 'agent.turnStarted' || event.type === 'agent.turnEnded',
  )?.type;

const readyParams = ({ event }: { event: { ready: AgentReady } }) => ({
  ready: event.ready,
});
const eventsParams = ({ event }: { event: { events: AgentEvent[] } }) => ({
  events: event.events,
});
const toFailed = {
  target: '.failed',
  actions: {
    type: 'rememberFailure',
    params: ({ event }: { event: { error: unknown } }) => ({
      error: event.error,
    }),
  },
} as const;

// One machine runs every Agent; the Session passes in the adapter to run.
export const agentMachine = setup({
  types: {
    input: {} as AgentInput,
    context: {} as AgentContext,
    events: {} as AgentCommand | VendorEvent,
    output: {} as AgentOutput,
  },
  actors: {
    vendorSession: fromCallback<AgentCommand, VendorSessionInput, VendorEvent>(
      ({ input, receive, sendBack }) => {
        const session = startVendorSession(input, sendBack);
        // Commands run in order, so a config change lands before the prompt that follows it.
        let queue = Promise.resolve();
        receive((command) => {
          queue = queue.then(() => session.run(command));
        });
        return session.stop;
      },
    ),
  },
  actions: {
    rememberReady: assign((_, params: { ready: AgentReady }) => ({
      capabilities: params.ready.capabilities,
    })),
    sendReady: sendTo(
      ({ context }) => context.parent,
      (_, params: { ready: AgentReady }) =>
        ({ type: 'agent.ready', ...params.ready }) satisfies AgentEvent,
    ),
    sendEvents: enqueueActions(
      ({ context, enqueue }, params: { events: AgentEvent[] }) => {
        for (const event of params.events)
          enqueue.sendTo(context.parent, event);
      },
    ),
    sendCommand: forwardTo('vendorSession'),
    stopVendorSession: sendTo('vendorSession', {
      type: 'agent.stop',
    } satisfies AgentCommand),
    rememberFailure: assign((_, params: { error: unknown }) => ({
      failure: describeError(params.error),
    })),
  },
  guards: {
    canStopShell: ({ context }) => context.capabilities?.stopShell === true,
    proposalStartsTurn: ({ context, event }) =>
      context.capabilities?.planApproval === 'startTurn' &&
      event.type === 'agent.answerPlanProposal' &&
      event.turnId !== undefined,
    startsTurn: (_, params: { events: AgentEvent[] }) =>
      lastTurnBoundary(params.events) === 'agent.turnStarted',
    endsTurn: (_, params: { events: AgentEvent[] }) =>
      lastTurnBoundary(params.events) === 'agent.turnEnded',
  },
}).createMachine({
  id: 'agent',
  context: ({ input }) => ({ ...input, capabilities: null, failure: null }),
  output: ({ context }) => ({ failure: context.failure }),
  invoke: {
    id: 'vendorSession',
    src: 'vendorSession',
    input: ({ context }) => ({
      adapter: context.adapter,
      connectInput: {
        sessionId: context.sessionId,
        cwd: context.cwd,
        vendorSessionId: context.vendorSessionId,
        configOptions: context.configOptions,
      },
    }),
    onError: toFailed,
  },
  initial: 'starting',
  on: {
    'agent.stop': { target: '.stopping' },
    'vendor.failed': toFailed,
  },
  states: {
    starting: {
      on: {
        'vendor.ready': {
          target: 'ready',
          actions: [
            { type: 'rememberReady', params: readyParams },
            { type: 'sendReady', params: readyParams },
          ],
        },
      },
    },
    ready: {
      on: {
        'agent.setConfigOption': { actions: 'sendCommand' },
        'agent.rename': { actions: 'sendCommand' },
        'agent.stopShell': { guard: 'canStopShell', actions: 'sendCommand' },
        'vendor.events': {
          actions: { type: 'sendEvents', params: eventsParams },
        },
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
            'vendor.events': {
              guard: { type: 'startsTurn', params: eventsParams },
              target: 'turn',
              actions: { type: 'sendEvents', params: eventsParams },
            },
          },
        },
        turn: {
          on: {
            'agent.cancel': { actions: 'sendCommand' },
            'agent.answerPermission': { actions: 'sendCommand' },
            'agent.answerElicitation': { actions: 'sendCommand' },
            'agent.answerPlanProposal': { actions: 'sendCommand' },
            'vendor.events': {
              guard: { type: 'endsTurn', params: eventsParams },
              target: 'idle',
              actions: { type: 'sendEvents', params: eventsParams },
            },
          },
        },
      },
    },
    stopping: {
      entry: 'stopVendorSession',
      on: {
        'agent.stop': {},
        'vendor.closed': { target: 'stopped' },
      },
    },
    stopped: { type: 'final' },
    failed: { type: 'final' },
  },
});
