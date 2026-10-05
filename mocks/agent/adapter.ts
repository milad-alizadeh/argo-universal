import type {
  AgentAdapter,
  AgentCommand,
  AgentConnectInput,
  AgentEvent,
  AgentReady,
} from '@repo/agents';

export type MockAgentStreamEvent = Exclude<AgentEvent, { type: 'agent.ready' }>;

export interface MockAgentStream {
  input: AgentConnectInput;
  send: (event: MockAgentStreamEvent) => void;
  fail: (error: unknown) => void;
  receive: (handler: (command: AgentCommand) => void) => void;
}

export interface MockAgentScript {
  connect?: (input: AgentConnectInput) => Promise<AgentReady>;
  stream: (stream: MockAgentStream) => undefined | (() => void);
  stop: (input: AgentConnectInput) => Promise<void>;
}

export const mockReady: AgentReady = {
  vendorSessionId: 'vendor-1',
  configOptions: [],
  capabilities: { planApproval: 'continueTurn', stopShell: false },
  continuedOutside: false,
};

// An adapter whose vendor messages are the Agent events a test scripts.
export const createMockAdapter = (
  { connect = async () => mockReady, stream, stop }: MockAgentScript,
  agent = 'mock',
): AgentAdapter<MockAgentStreamEvent, null> => ({
  agent,
  initialMappingState: () => null,
  toAgentEvents: (event, mappingState) => ({ events: [event], mappingState }),
  async connect(input, listener) {
    const ready = await connect(input);
    const handlers: ((command: AgentCommand) => void)[] = [];
    const cleanup = stream({
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
      cancel: forward,
      setConfigOption: forward,
      answerPermission: forward,
      answerElicitation: forward,
      answerPlanProposal: forward,
      rename: forward,
      stopShell: forward,
      stop: async () => {
        cleanup?.();
        await stop(input);
      },
    };
  },
});
