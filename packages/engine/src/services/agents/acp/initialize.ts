import type {
  ClientContext,
  InitializeRequest,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import { sessionCapabilities } from './open-session';
import type { createAcpResponseReaders } from './response-readers';

const initializeRequest: InitializeRequest = {
  protocolVersion: 1,
  clientCapabilities: {
    plan: {},
    session: { notices: {}, compaction: {} },
    elicitation: { form: {} },
  },
};

// The one ACP initialize Argo sends; an Agent that cannot close single Sessions is refused.
export const negotiateAcpInitialize = async (
  agent: ClientContext,
  readers: ReturnType<typeof createAcpResponseReaders>,
): Promise<InitializeResponse> => {
  const response = readers.initialize.parse(
    await agent.request<unknown>('initialize', initializeRequest),
  );
  if (!sessionCapabilities(response)?.close)
    throw new Error('Agent cannot close independent ACP sessions');
  return response;
};
