import type {
  AgentCommand,
  AgentEvent,
  AgentInput,
  AgentOutput,
} from '@repo/agents';
import {
  type ActorRef,
  assertEvent,
  assign,
  fromCallback,
  fromPromise,
  type Snapshot,
  sendTo,
  setup,
} from 'xstate';

export type MockAgentReady = Extract<AgentEvent, { type: 'agent.ready' }>;
export type MockAgentStreamEvent = Exclude<AgentEvent, MockAgentReady>;

type MockAgentEvent =
  | AgentCommand
  | { type: 'mock.event'; event: MockAgentStreamEvent }
  | { type: 'mock.failed'; error: unknown };

interface MockAgentContext extends AgentInput {
  ready: MockAgentReady | null;
  failure: string | null;
}

export interface MockAgentStream {
  input: AgentInput;
  send: (event: MockAgentStreamEvent) => void;
  fail: (error: unknown) => void;
  receive: (handler: (command: AgentCommand) => void) => void;
}

export interface MockAgentScript {
  connect: (input: AgentInput) => Promise<MockAgentReady>;
  stream: (stream: MockAgentStream) => undefined | (() => void);
  stop: (input: AgentInput) => Promise<void>;
}

interface StreamInput {
  agent: AgentInput;
  parent: ActorRef<Snapshot<unknown>, MockAgentEvent>;
}

export const createMockAgentMachine = (script: MockAgentScript) =>
  setup({
    types: {
      input: {} as AgentInput,
      context: {} as MockAgentContext,
      events: {} as MockAgentEvent,
      output: {} as AgentOutput,
    },
    actors: {
      connect: fromPromise<MockAgentReady, AgentInput>(({ input }) =>
        script.connect(input),
      ),
      vendorStream: fromCallback<AgentCommand, StreamInput>(
        ({ input, receive }) =>
          script.stream({
            input: input.agent,
            send: (event) => input.parent.send({ type: 'mock.event', event }),
            fail: (error) => input.parent.send({ type: 'mock.failed', error }),
            receive,
          }),
      ),
      stop: fromPromise<void, AgentInput>(({ input }) => script.stop(input)),
    },
    actions: {
      rememberReady: assign((_, params: { ready: MockAgentReady }) => ({
        ready: params.ready,
      })),
      rememberFailure: assign((_, params: { error: unknown }) => ({
        failure: String(params.error),
      })),
      sendReady: sendTo(
        ({ context }) => context.parent,
        ({ context }) => {
          if (!context.ready)
            throw new Error('Mock agent connected without ready data');
          return context.ready;
        },
      ),
      sendEvent: sendTo(
        ({ context }) => context.parent,
        ({ event }) => {
          assertEvent(event, 'mock.event');
          return event.event;
        },
      ),
      sendCommand: sendTo('vendorStream', ({ event }) => {
        assertEvent(event, [
          'agent.prompt',
          'agent.cancel',
          'agent.answerPermission',
          'agent.answerElicitation',
          'agent.setConfigOption',
          'agent.answerPlanProposal',
          'agent.rename',
          'agent.stopShell',
        ]);
        return event;
      }),
    },
    guards: {
      canStopShell: ({ context }) =>
        context.ready?.capabilities.stopShell === true,
      turnStarted: ({ event }) =>
        event.type === 'mock.event' && event.event.type === 'agent.turnStarted',
      turnEnded: ({ event }) =>
        event.type === 'mock.event' && event.event.type === 'agent.turnEnded',
      proposalStartsTurn: ({ context, event }) =>
        context.ready?.capabilities.planApproval === 'startTurn' &&
        event.type === 'agent.answerPlanProposal' &&
        event.turnId !== undefined,
    },
  }).createMachine({
    id: 'mockAgent',
    context: ({ input }) => ({ ...input, ready: null, failure: null }),
    output: ({ context }) => ({ failure: context.failure }),
    initial: 'starting',
    on: { 'agent.stop': { target: '.stopping' } },
    states: {
      starting: {
        invoke: {
          id: 'connect',
          src: 'connect',
          input: ({ context }) => context,
          onDone: {
            target: 'ready',
            actions: {
              type: 'rememberReady',
              params: ({ event }) => ({ ready: event.output }),
            },
          },
          onError: {
            target: 'failed',
            actions: {
              type: 'rememberFailure',
              params: ({ event }) => ({ error: event.error }),
            },
          },
        },
      },
      ready: {
        entry: 'sendReady',
        invoke: {
          id: 'vendorStream',
          src: 'vendorStream',
          input: ({ context, self }) => ({ agent: context, parent: self }),
          onError: {
            target: 'failed',
            actions: {
              type: 'rememberFailure',
              params: ({ event }) => ({ error: event.error }),
            },
          },
        },
        on: {
          'agent.setConfigOption': { actions: 'sendCommand' },
          'agent.rename': { actions: 'sendCommand' },
          'agent.stopShell': { guard: 'canStopShell', actions: 'sendCommand' },
          'mock.event': { actions: 'sendEvent' },
          'mock.failed': {
            target: 'failed',
            actions: {
              type: 'rememberFailure',
              params: ({ event }) => ({ error: event.error }),
            },
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
              'mock.event': [
                { guard: 'turnStarted', target: 'turn', actions: 'sendEvent' },
                { actions: 'sendEvent' },
              ],
            },
          },
          turn: {
            on: {
              'agent.cancel': { actions: 'sendCommand' },
              'agent.answerPermission': { actions: 'sendCommand' },
              'agent.answerElicitation': { actions: 'sendCommand' },
              'agent.answerPlanProposal': { actions: 'sendCommand' },
              'mock.event': [
                { guard: 'turnEnded', target: 'idle', actions: 'sendEvent' },
                { actions: 'sendEvent' },
              ],
            },
          },
        },
      },
      stopping: {
        on: { 'agent.stop': {} },
        invoke: {
          id: 'stop',
          src: 'stop',
          input: ({ context }) => context,
          onDone: { target: 'stopped' },
          onError: {
            target: 'failed',
            actions: {
              type: 'rememberFailure',
              params: ({ event }) => ({ error: event.error }),
            },
          },
        },
      },
      stopped: { type: 'final' },
      failed: { type: 'final' },
    },
  });
