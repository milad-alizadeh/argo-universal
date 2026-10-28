import { expect, it } from 'vitest';
import { createScriptedAgentWire } from '#mocks/scripted-agent';
import { createAgentClient } from './client';
import {
  routeTerminalRequests,
  type TerminalRequests,
} from './terminal-requests';

const creating = (calls: string[], terminalId: string): TerminalRequests => ({
  'terminal/create': () => {
    calls.push(terminalId);

    return { terminalId };
  },
  'terminal/output': () => ({ output: '', truncated: false }),
  'terminal/kill': () => ({}),
  'terminal/wait_for_exit': () => ({ exitCode: 0 }),
  'terminal/release': () => ({}),
});

type CreateRequest = {
  jsonrpc: '2.0';
  id: number;
  method: 'terminal/create';
  params: { sessionId: string; command: string };
};

const createRequest = (id: number, sessionId: string): CreateRequest => ({
  jsonrpc: '2.0',
  id,
  method: 'terminal/create',
  params: { sessionId, command: 'echo' },
});

it('sends a terminal request to the destination of the Agent session it names', async (): Promise<void> => {
  const calls: string[] = [];
  const peer = createScriptedAgentWire({ steps: [] });

  const connection = createAgentClient({
    stream: peer.stream,
    terminalRequests: routeTerminalRequests((sessionId) =>
      creating(calls, `${sessionId}-terminal`),
    ),
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

  await peer.send([createRequest(1, 'first'), createRequest(2, 'second')]);
  const responses = [await peer.receive(), await peer.receive()];

  expect(calls.toSorted()).toEqual(['first-terminal', 'second-terminal']);
  expect(responses).toContainEqual({
    jsonrpc: '2.0',
    id: 1,
    result: { terminalId: 'first-terminal' },
  });
  connection.close();
  await connection.closed;
});

it('answers a terminal request for an Agent session with no terminal service by failing it', async (): Promise<void> => {
  const peer = createScriptedAgentWire({ steps: [] });

  const connection = createAgentClient({
    stream: peer.stream,
    terminalRequests: routeTerminalRequests(() => {}),
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });

  await peer.send([createRequest(1, 'gone')]);

  expect(await peer.receive()).toMatchObject({
    id: 1,
    error: { message: expect.stringContaining('Internal error') },
  });
  connection.close();
  await connection.closed;
});
