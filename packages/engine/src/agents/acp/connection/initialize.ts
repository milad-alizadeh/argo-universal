import type {
  ClientCapabilities,
  ClientContext,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { createAcpResponseReaders } from './response-readers';

type Readers = ReturnType<typeof createAcpResponseReaders>;

const clientCapabilities: ClientCapabilities = {
  auth: { terminal: true },
  session: { configOptions: { boolean: {} }, notices: {}, compaction: {} },
  elicitation: { form: {} },
};

const negotiate = async (
  agent: ClientContext,
  readers: Readers,
  capabilities: ClientCapabilities,
): Promise<InitializeResponse> => {
  const response = readers.initialize.parse(
    await agent.request<unknown>('initialize', {
      protocolVersion: 1,
      clientCapabilities: capabilities,
    }),
  );

  if (response.protocolVersion < 1)
    throw new Error('Agent requires ACP protocol version 1 or newer');

  return response;
};

export const negotiateAcpInitialize = (
  agent: ClientContext,
  readers: Readers,
): Promise<InitializeResponse> =>
  negotiate(agent, readers, { ...clientCapabilities, terminal: true });

// The old login stack keeps its own capabilities until T6 deletes it.
export const negotiateLoginInitialize = (
  agent: ClientContext,
  readers: Readers,
  terminalAuth: boolean | undefined,
): Promise<InitializeResponse> =>
  negotiate(agent, readers, {
    ...clientCapabilities,
    auth: terminalAuth ? { terminal: true } : {},
    elicitation: { form: {}, url: {} },
  });
