import type { AnyMessage } from '@agentclientprotocol/sdk';
import { onTestFinished } from 'vitest';
import { createAgentClient } from '../src/agents';
import type { Shells } from '../src/sessions';
import { createScriptedAgentWire } from './scripted-agent';

type Destination = ReturnType<Shells['attach']>;

// The Agent's side of ACP: sends terminal requests down a wire and reads the response.
export type TerminalCall = (
  method: string,
  params: Record<string, string>,
) => Promise<AnyMessage>;

export const agentSide = (destination: Destination): TerminalCall => {
  const wire = createScriptedAgentWire({ steps: [] });

  const connection = createAgentClient({
    stream: wire.stream,
    terminalRequests: destination.terminalRequests,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

  onTestFinished(async () => {
    connection.close();
    await connection.closed;
  });

  return terminalCalls(wire);
};

const terminalCalls = (
  wire: ReturnType<typeof createScriptedAgentWire>,
): TerminalCall => {
  let requests = 0;

  return async (method, params) => {
    await wire.send([terminalRequest(++requests, method, params)]);

    return wire.receive();
  };
};

const terminalRequest = (
  id: number,
  method: string,
  params: Record<string, string>,
): AnyMessage => ({
  jsonrpc: '2.0' as const,
  id,
  method,
  params: { sessionId: 'acp-session', ...params },
});
