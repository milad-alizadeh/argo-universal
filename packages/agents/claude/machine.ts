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
  AgentCapabilities,
  AgentCommand,
  AgentEvent,
  AgentInput,
  AgentOutput,
} from '../src/agent-events';
import {
  initialMappingState,
  type MappingState,
  toAgentEvents,
} from './to-agent-events';
import {
  runVendorSession,
  type VendorCommand,
  type VendorEvent,
} from './vendor-session';

export const claudeCapabilities: AgentCapabilities = {
  planApproval: 'continueTurn',
  stopShell: false,
};

interface ClaudeContext extends AgentInput {
  mappingState: MappingState;
  failure: string | null;
}

export interface VendorSessionActorInput {
  agent: Omit<AgentInput, 'parent'>;
  parent: ActorRef<Snapshot<unknown>, AgentCommand | VendorEvent>;
}

const endsTurn = (
  event: AgentCommand | VendorEvent,
  mappingState: MappingState,
) =>
  event.type === 'vendor.message' &&
  toAgentEvents(event.message, mappingState).events.some(
    (agentEvent) => agentEvent.type === 'agent.turnEnded',
  );

export const claudeMachine = setup({
  types: {
    input: {} as AgentInput,
    context: {} as ClaudeContext,
    events: {} as AgentCommand | VendorEvent,
    output: {} as AgentOutput,
  },
  actors: {
    vendorSession: fromCallback<VendorCommand, VendorSessionActorInput>(
      ({ input, receive }) =>
        runVendorSession({
          agent: input.agent,
          send: (event) => input.parent.send(event),
          receive,
        }),
    ),
  },
  actions: {
    sendReady: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'vendor.connected');
      enqueue.assign({ mappingState: initialMappingState(event.runId) });
      enqueue.sendTo(context.parent, {
        type: 'agent.ready',
        vendorSessionId: event.vendorSessionId,
        configOptions: event.configOptions,
        capabilities: claudeCapabilities,
        continuedOutside: false,
      } satisfies AgentEvent);
    }),
    mapMessage: enqueueActions(({ context, event, enqueue }) => {
      assertEvent(event, 'vendor.message');
      const { events, mappingState } = toAgentEvents(
        event.message,
        context.mappingState,
      );
      enqueue.assign({ mappingState });
      for (const agentEvent of events)
        enqueue.sendTo(context.parent, agentEvent);
    }),
    sendUsage: sendTo(
      ({ context }) => context.parent,
      ({ event }) => {
        assertEvent(event, 'vendor.usage');
        return { type: 'agent.usage', usage: event.usage } satisfies AgentEvent;
      },
    ),
    sendConfigOptions: sendTo(
      ({ context }) => context.parent,
      ({ event }) => {
        assertEvent(event, 'vendor.configOptionsChanged');
        return {
          type: 'agent.configOptionsChanged',
          configOptions: event.configOptions,
        } satisfies AgentEvent;
      },
    ),
    sendCommand: sendTo('vendorSession', ({ event }) => {
      assertEvent(event, [
        'agent.prompt',
        'agent.cancel',
        'agent.setConfigOption',
        'agent.stop',
      ]);
      return event;
    }),
    rememberFailure: assign(({ event }) => {
      assertEvent(event, 'vendor.failed');
      return { failure: event.error };
    }),
  },
  guards: {
    endsTurn: ({ context, event }) => endsTurn(event, context.mappingState),
  },
}).createMachine({
  id: 'claude',
  context: ({ input }) => ({
    ...input,
    mappingState: initialMappingState(input.sessionId),
    failure: null,
  }),
  output: ({ context }) => ({ failure: context.failure }),
  invoke: {
    id: 'vendorSession',
    src: 'vendorSession',
    input: ({ context, self }) => ({
      agent: {
        sessionId: context.sessionId,
        cwd: context.cwd,
        vendorSessionId: context.vendorSessionId,
        configOptions: context.configOptions,
      },
      parent: self,
    }),
  },
  initial: 'connecting',
  on: {
    'agent.stop': { target: '.stopping' },
    'vendor.failed': { target: '.failed', actions: 'rememberFailure' },
  },
  states: {
    connecting: {
      on: { 'vendor.connected': { target: 'ready', actions: 'sendReady' } },
    },
    ready: {
      on: {
        'agent.setConfigOption': { actions: 'sendCommand' },
        'vendor.usage': { actions: 'sendUsage' },
        'vendor.configOptionsChanged': { actions: 'sendConfigOptions' },
        'vendor.message': { actions: 'mapMessage' },
      },
      initial: 'idle',
      states: {
        idle: {
          on: {
            'agent.prompt': { target: 'turn', actions: 'sendCommand' },
          },
        },
        turn: {
          on: {
            'agent.cancel': { actions: 'sendCommand' },
            'vendor.message': [
              { guard: 'endsTurn', target: 'idle', actions: 'mapMessage' },
              { actions: 'mapMessage' },
            ],
          },
        },
      },
    },
    stopping: {
      entry: 'sendCommand',
      on: {
        'agent.stop': {},
        'vendor.failed': {},
        'vendor.closed': { target: 'stopped' },
      },
    },
    stopped: { type: 'final' },
    failed: { type: 'final' },
  },
});
