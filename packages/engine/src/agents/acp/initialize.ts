import type {
  ClientContext,
  ElicitationCapabilities,
  InitializeRequest,
  InitializeResponse,
  ClientCapabilities,
} from '@agentclientprotocol/sdk';
import type { createAcpResponseReaders } from './response-readers';

type InitializeCapabilities = {
  elicitation?: Pick<ElicitationCapabilities, 'url'>;
  terminalAuth?: boolean;
};

const terminalCapability = (
  capabilities: InitializeCapabilities | undefined,
): Pick<ClientCapabilities, 'auth'> =>
  capabilities?.terminalAuth ? { auth: { terminal: true } } : {};

const initializeRequest = (
  capabilities?: InitializeCapabilities,
): InitializeRequest => ({
  protocolVersion: 1,
  clientCapabilities: {
    ...terminalCapability(capabilities),
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
