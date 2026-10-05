import type {
  AgentAdapter,
  AgentConnectInput,
  AgentEvent,
  AgentReady,
  VendorCommand,
} from '@repo/agents';

export type MockAgentStreamEvent = Exclude<AgentEvent, { type: 'agent.ready' }>;

export interface MockAgentStream {
  input: AgentConnectInput;
  send: (event: MockAgentStreamEvent) => void;
  fail: (error: unknown) => void;
  receive: (handler: (command: VendorCommand) => void) => void;
}

export interface MockAgentScript {
  connect?: (input: AgentConnectInput) => Promise<AgentReady>;
  stream?: (stream: MockAgentStream) => undefined | (() => void);
  stop?: (input: AgentConnectInput) => Promise<void>;
}

export const mockReady: AgentReady = {
  vendorSessionId: 'vendor-1',
  configOptions: [],
  capabilities: { planApproval: 'continueTurn', stopShell: false },
  continuedOutside: false,
};

export const mockReadyEvent = { type: 'agent.ready', ...mockReady } as const;

// An adapter whose vendor messages are the Agent events a test scripts.
export const createMockAdapter = (
  {
    connect = async () => mockReady,
    stream = () => undefined,
    stop = async () => {},
  }: MockAgentScript = {},
  agent = 'mock',
): AgentAdapter<MockAgentStreamEvent, null> => ({
  agent,
  initialMappingState: () => null,
  toAgentEvents: (event, mappingState) => ({ events: [event], mappingState }),
  async connect(input, listener) {
    const ready = await connect(input);
    const handlers: ((command: VendorCommand) => void)[] = [];
    const cleanup = stream({
      input,
      send: listener.message,
      fail: listener.failed,
      receive: (handler) => handlers.push(handler),
    });
    return {
      ready,
      run: async (command) => {
        for (const handler of handlers) handler(command);
      },
      stop: async () => {
        cleanup?.();
        await stop(input);
      },
    };
  },
});
