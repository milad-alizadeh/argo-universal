import type {
  ClientContext,
  ElicitationCapabilities,
  InitializeRequest,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { createAcpResponseReaders } from './response-readers';

type InitializeCapabilities = {
  elicitation?: Pick<ElicitationCapabilities, 'url'>;
  terminalAuth?: boolean;
};

const terminalAuth = (
  capabilities: InitializeCapabilities | undefined,
): boolean => capabilities?.terminalAuth ?? true;

const initializeRequest = (
  capabilities?: InitializeCapabilities,
): InitializeRequest => ({
  protocolVersion: 1,
  clientCapabilities: {
    auth: { terminal: terminalAuth(capabilities) },
    session: { configOptions: { boolean: {} }, notices: {}, compaction: {} },
    elicitation: { form: {}, ...capabilities?.elicitation },
  },
});

export const negotiateAcpInitialize = async (
  agent: ClientContext,
  readers: ReturnType<typeof createAcpResponseReaders>,
  capabilities?: InitializeCapabilities,
): Promise<InitializeResponse> => {
  const response = readers.initialize.parse(
    await agent.request<unknown>('initialize', initializeRequest(capabilities)),
  );

  if (response.protocolVersion < 1)
    throw new Error('Agent requires ACP protocol version 1 or newer');

  return response;
};
