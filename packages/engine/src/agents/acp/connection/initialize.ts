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
  // Without it, claude-agent-acp and codex-acp draw a child Session's work as plain tool calls.
  subagents: {},
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
