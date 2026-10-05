import {
  type AgentAdapter,
  type AgentCommand,
  type AgentConnectInput,
  type AgentEvent,
  createAgentMachine,
} from '@repo/agents';

export type MockAgentReady = Extract<AgentEvent, { type: 'agent.ready' }>;
export type MockAgentStreamEvent = Exclude<AgentEvent, MockAgentReady>;

export interface MockAgentStream {
  input: AgentConnectInput;
  send: (event: MockAgentStreamEvent) => void;
  fail: (error: unknown) => void;
  receive: (handler: (command: AgentCommand) => void) => void;
}

export interface MockAgentScript {
  connect: (input: AgentConnectInput) => Promise<MockAgentReady>;
  stream: (stream: MockAgentStream) => undefined | (() => void);
  stop: (input: AgentConnectInput) => Promise<void>;
}

// An adapter whose vendor messages are the Agent events a test scripts.
export const createMockAdapter = (
  script: MockAgentScript,
): AgentAdapter<MockAgentStreamEvent, null> => ({
  agent: 'mock',
  initialMappingState: () => null,
  toAgentEvents: (event, mappingState) => ({ events: [event], mappingState }),
  async connect(input, listener) {
    const { type: _type, ...ready } = await script.connect(input);
    const handlers: ((command: AgentCommand) => void)[] = [];
    const cleanup = script.stream({
      input,
      send: listener.message,
      fail: (error) => listener.failed(String(error)),
      receive: (handler) => handlers.push(handler),
    });
    const forward = async (command: AgentCommand) => {
      for (const handler of handlers) handler(command);
    };
    return {
      ready,
      prompt: forward,
      cancel: () => forward({ type: 'agent.cancel' }),
      setConfigOption: forward,
      answerPermission: forward,
      answerElicitation: forward,
      answerPlanProposal: forward,
      rename: forward,
      stopShell: forward,
      stop: async () => {
        cleanup?.();
        await script.stop(input);
      },
    };
  },
});

export const createMockAgentMachine = (script: MockAgentScript) =>
  createAgentMachine([createMockAdapter(script)]);
