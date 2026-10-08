import {
  assertEvent,
  assign,
  forwardTo,
  fromCallback,
  sendTo,
  setup,
} from 'xstate';
import type { ActorRef, GuardArgs, Snapshot } from 'xstate';
import type {
  AgentAdapter,
  AgentConnectInput,
  AgentMapping,
  AgentReady,
} from './agent-adapter';
import type {
  AgentCapabilities,
  AgentCommand,
  AgentEvent,
} from './agent-events';
import { describeError } from './describe-error';

export type AgentParent = ActorRef<Snapshot<unknown>, AgentEvent>;

export interface AgentInput extends AgentConnectInput {
  adapter: AgentAdapter;
  parent: AgentParent;
}

export interface AgentOutput {
  failure: string | null;
}

const agentStartLimit = 10_000;

// Wrapped, because Agent event types share the `agent.` prefix with commands.
type VendorEvent =
  | { type: 'vendor.ready'; ready: AgentReady }
  | { type: 'vendor.event'; event: AgentEvent }
  | { type: 'vendor.failed'; error: unknown }
  | { type: 'vendor.closed' };

type AgentMachineEvent = AgentCommand | VendorEvent;

type AgentTurnGuard = (
  args: Pick<GuardArgs<AgentContext, AgentMachineEvent>, 'event'>,
) => boolean;

// The adapter and parent ref are behaviour, so an Agent snapshot is not persistable.
interface AgentContext extends AgentInput {
  capabilities: AgentCapabilities | null;
  failure: string | null;
}

type VendorSessionInput = AgentConnectInput & { adapter: AgentAdapter };

// Starts the adapter's vendor session, maps its messages, and reports both as vendor events.
function startVendorSession(
  { adapter, ...input }: VendorSessionInput,
  sendBack: (event: VendorEvent) => void,
): { run: (command: AgentCommand) => Promise<void>; stop: () => undefined } {
  const fail = (error: unknown): void =>
    sendBack({ type: 'vendor.failed', error });
  const controller = new AbortController();
  let mappingState = adapter.initialMappingState();
  // Events wait here until the machine has the ready data they depend on.
  let isReady = false;
  const early: AgentEvent[] = [];
  let stopping: Promise<void> | undefined;

  const sendEvent = (event: AgentEvent): void => {
    if (controller.signal.aborted) return;
    if (isReady) sendBack({ type: 'vendor.event', event });
    else early.push(event);
  };
  // Resolves to null when starting fails, after reporting it.
  const starting = adapter
    .connect(
      input,
      {
        message: (message): void => {
          if (controller.signal.aborted) return;
          let mapped: AgentMapping<unknown>;
          try {
            mapped = adapter.toAgentEvents(message, mappingState);
          } catch (error) {
            sendEvent({
              type: 'agent.messageRejected',
              reason: describeError(error),
            });
            return;
          }
          mappingState = mapped.mappingState;
          mapped.events.forEach(sendEvent);
        },
        event: sendEvent,
        failed: (error): void => {
          if (!controller.signal.aborted) fail(error);
        },
      },
      controller.signal,
    )
    .then(
      (session): import('./agent-adapter').VendorSession => {
        if (controller.signal.aborted) return session;
        sendBack({ type: 'vendor.ready', ready: session.ready });
        isReady = true;
        early.splice(0).forEach(sendEvent);
        return session;
      },
      (error: unknown): null => {
        if (!stopping) fail(error);
        return null;
      },
    );

  // Stops once, after starting settles.
  const stop = (): Promise<void> => {
    if (!stopping) {
      stopping = starting.then((session): Promise<void> | undefined =>
        session?.stop(),
      );
      controller.abort();
    }
    return stopping;
  };

  const run = async (command: AgentCommand): Promise<void> => {
    try {
      if (command.type === 'agent.stop') {
        await stop();
        sendBack({ type: 'vendor.closed' });
        return;
      }
      if (controller.signal.aborted) return;
      const session = await starting;
      if (!controller.signal.aborted) await session?.run(command);
    } catch (error) {
      if (command.type === 'agent.stop' || !controller.signal.aborted)
        fail(error);
    }
  };

  return { run, stop: (): undefined => void stop().catch((): void => {}) };
}

const isTurnEvent =
  (type: 'agent.turnStarted' | 'agent.turnEnded'): AgentTurnGuard =>
  ({ event }): boolean =>
    event.type === 'vendor.event' && event.event.type === type;

// One machine runs every Agent; the Session passes in the adapter to run.
export const agentMachine = setup({
  types: {
    input: {} as AgentInput,
    context: {} as AgentContext,
    events: {} as AgentMachineEvent,
    output: {} as AgentOutput,
  },
  actors: {
    vendorSession: fromCallback<AgentCommand, VendorSessionInput, VendorEvent>(
      ({ input, receive, sendBack }): (() => undefined) => {
        const session = startVendorSession(input, sendBack);
        // Ordinary commands run in order, so config changes land before the next prompt.
        let queue = Promise.resolve();
        let beforeTurn = queue;
        receive((command): void => {
          if (command.type === 'agent.stop') {
            void session.run(command);
            return;
          }
          if (
            command.type === 'agent.cancel' ||
            command.type === 'agent.answerPermission' ||
            command.type === 'agent.answerElicitation'
          ) {
            // Request replies and cancel can release a pending prompt response.
            void beforeTurn.then((): Promise<void> => session.run(command));
            return;
          }
          if (
            command.type === 'agent.prompt' ||
            (command.type === 'agent.answerPlanProposal' &&
              command.turnId !== undefined)
          )
            beforeTurn = queue;
          queue = queue.then((): Promise<void> => session.run(command));
        });
        return session.stop;
      },
    ),
  },
  actions: {
    rememberStartLimit: assign({
      failure: `Agent startup exceeded agentStartLimit (${agentStartLimit} ms). Retry the Session.`,
    }),
    rememberReady: assign(({ event }): Pick<AgentReady, 'capabilities'> => {
      assertEvent(event, 'vendor.ready');
      return { capabilities: event.ready.capabilities };
    }),
    sendReady: sendTo(
      ({ context }): AgentParent => context.parent,
      ({ event }): Extract<AgentEvent, { type: 'agent.ready' }> => {
        assertEvent(event, 'vendor.ready');
        return { type: 'agent.ready', ...event.ready } satisfies AgentEvent;
      },
    ),
    sendEvent: sendTo(
      ({ context }): AgentParent => context.parent,
      ({ event }): AgentEvent => {
        assertEvent(event, 'vendor.event');
        return event.event;
      },
    ),
    sendCommand: forwardTo('vendorSession'),
    stopVendorSession: sendTo('vendorSession', {
      type: 'agent.stop',
    } satisfies AgentCommand),
    // Runs on `vendor.failed` and on the vendor session actor's error event.
    rememberFailure: assign({
      failure: ({ event }): string | null =>
        'error' in event ? describeError(event.error) : null,
    }),
  },
  delays: { agentStartLimit },
  guards: {
    canStopShell: ({ context }): boolean =>
      context.capabilities?.stopShell === true,
    proposalStartsTurn: ({ context, event }): boolean =>
      context.capabilities?.planApproval === 'startTurn' &&
      event.type === 'agent.answerPlanProposal' &&
      event.turnId !== undefined,
    startsTurn: isTurnEvent('agent.turnStarted'),
    endsTurn: isTurnEvent('agent.turnEnded'),
  },
}).createMachine({
  id: 'agent',
  context: ({ input }): AgentContext => ({
    ...input,
    capabilities: null,
    failure: null,
  }),
  output: ({ context }): AgentOutput => ({
    failure: context.failure,
  }),
  invoke: {
    id: 'vendorSession',
    src: 'vendorSession',
    input: ({
      context: { adapter, sessionId, cwd, vendorSessionId, configOptions },
    }): VendorSessionInput => ({
      adapter,
      sessionId,
      cwd,
      vendorSessionId,
      configOptions,
    }),
    onError: { target: '.failed', actions: 'rememberFailure' },
  },
  initial: 'starting',
  on: {
    'agent.stop': { target: '.stopping' },
    'vendor.failed': { target: '.failed', actions: 'rememberFailure' },
  },
  states: {
    starting: {
      after: {
        agentStartLimit: { target: 'failed', actions: 'rememberStartLimit' },
      },
      on: {
        'vendor.ready': {
          target: 'ready',
          actions: ['rememberReady', 'sendReady'],
        },
      },
    },
    ready: {
      on: {
        'agent.setConfigOption': { actions: 'sendCommand' },
        'agent.rename': { actions: 'sendCommand' },
        'agent.stopShell': { guard: 'canStopShell', actions: 'sendCommand' },
        'vendor.event': { actions: 'sendEvent' },
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
            'vendor.event': {
              guard: 'startsTurn',
              target: 'turn',
              actions: 'sendEvent',
            },
          },
        },
        turn: {
          on: {
            'agent.cancel': { actions: 'sendCommand' },
            'agent.answerPermission': { actions: 'sendCommand' },
            'agent.answerElicitation': { actions: 'sendCommand' },
            'agent.answerPlanProposal': { actions: 'sendCommand' },
            'vendor.event': {
              guard: 'endsTurn',
              target: 'idle',
              actions: 'sendEvent',
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
