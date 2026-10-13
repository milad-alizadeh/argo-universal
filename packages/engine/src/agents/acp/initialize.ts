import type {
  ClientContext,
  ElicitationCapabilities,
  InitializeRequest,
  InitializeResponse,
  ClientCapabilities,
} from '@agentclientprotocol/sdk';
import { sessionCapabilities } from './open-session';
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
    plan: {},
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
  if (!sessionCapabilities(response)?.close)
    throw new Error('Agent cannot close independent ACP sessions');
  return response;
};
