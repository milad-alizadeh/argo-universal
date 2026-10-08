import type {
  AgentAdapter,
  AgentConnectInput,
  AgentEvent,
  AgentMapping,
  VendorSession,
  AgentProbe,
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
  connect?: (
    input: AgentConnectInput,
    signal: AbortSignal,
  ) => Promise<AgentReady>;
  stream?: (stream: MockAgentStream) => undefined | (() => void);
  stop?: (input: AgentConnectInput) => Promise<void>;
  probe?: (signal: AbortSignal) => Promise<AgentProbe>;
}

export const mockReady: AgentReady = {
  vendorSessionId: 'vendor-1',
  configOptions: [],
  capabilities: {
    permissionFeedback: true,
    planApproval: 'continueTurn',
    stopShell: false,
  },
  continuedOutside: false,
};

export const mockReadyEvent = { type: 'agent.ready', ...mockReady } as const;

// An adapter whose vendor messages are the Agent events a test scripts.
export const createMockAdapter = (
  {
    connect = async (): Promise<AgentReady> => mockReady,
    stream = (): undefined => undefined,
    stop = async (): Promise<void> => {},
    probe = async (): Promise<AgentProbe> => ({
      availability: 'available',
      configOptions: [],
    }),
  }: MockAgentScript = {},
  agent = 'mock',
): AgentAdapter<MockAgentStreamEvent, null> => ({
  agent,
  label: agent,
  logo: '<svg xmlns="http://www.w3.org/2000/svg"/>',
  probe,
  initialMappingState: (): null => null,
  toAgentEvents: (event, mappingState): AgentMapping<null> => ({
    events: [event],
    mappingState,
  }),
  async connect(input, listener, signal): Promise<VendorSession> {
    const ready = await connect(input, signal);
    const handlers: ((command: VendorCommand) => void)[] = [];
    const cleanup = stream({
      input,
      send: listener.message,
      fail: listener.failed,
      receive: (handler): number => handlers.push(handler),
    });
    return {
      ready,
      run: async (command): Promise<void> => {
        for (const handler of handlers) handler(command);
      },
      stop: async (): Promise<void> => {
        cleanup?.();
        await stop(input);
      },
    };
  },
});
