import { expect, it } from 'vitest';
import { createAcpPeer, readAcpRequest } from '#mocks/acp-peer';
import { acpResponses } from '#mocks/acp-responses';
import { createRejectionCounter } from '../../../lib/count-rejections';
import { createAgentClient } from './client';
import { createAcpResponseReaders } from './response-readers';

const responseSource = 'ACP responses';

it('rejects and counts an unchecked malformed SDK response body once', async () => {
  const peer = createAcpPeer();
  const rejections = createRejectionCounter(responseSource);
  const readers = createAcpResponseReaders(rejections);
  const connection = createAgentClient({
    stream: peer.stream,
    acceptSessionUpdate: () => {},
    requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
    createElicitation: () => ({ action: 'cancel' }),
  });
  const prompt = connection.agent
    .request<unknown>('session/prompt', {
      sessionId: 'one',
      prompt: [{ type: 'text', text: 'Start' }],
    })
    .then(readers['session/prompt'].parse)
    .catch((error: unknown) => error);
  const request = await readAcpRequest(peer);
  await peer.send([
    { jsonrpc: '2.0', id: request.id, result: { stopReason: 42 } },
  ]);
  expect({ result: await prompt, count: rejections.count() }).toEqual({
    result: expect.objectContaining({
      message: expect.stringContaining('stopReason must be string'),
    }),
    count: 1,
  });
  connection.close();
  await connection.closed;
});

it.each(Object.values(acpResponses))(
  'accepts the legitimate $method response through its official schema',
  async (example) => {
    const peer = createAcpPeer();
    const rejections = createRejectionCounter(responseSource);
    const readers = createAcpResponseReaders(rejections);
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: () => {},
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });
    const response = connection.agent
      .request<unknown>(example.method, example.params)
      .then((value) => readers[example.method].parse(value));
    const request = await readAcpRequest(peer);
    await peer.send([
      { jsonrpc: '2.0', id: request.id, result: example.response },
    ]);
    expect({
      response: await response,
      rejections: rejections.count(),
    }).toEqual({ response: example.response, rejections: 0 });
    connection.close();
    await connection.closed;
  },
);

it.each(Object.values(acpResponses))(
  'rejects an invalid $method response body before domain use',
  async (example) => {
    const peer = createAcpPeer();
    const rejections = createRejectionCounter(responseSource);
    const readers = createAcpResponseReaders(rejections);
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: () => {},
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });
    const response = connection.agent
      .request<unknown>(example.method, example.params)
      .then((value) => readers[example.method].parse(value))
      .catch((error: unknown) => error);
    const request = await readAcpRequest(peer);
    await peer.send([{ jsonrpc: '2.0', id: request.id, result: 42 }]);
    expect({ result: await response, count: rejections.count() }).toEqual({
      result: expect.objectContaining({
        message: expect.stringContaining('data must be object'),
      }),
      count: 1,
    });
    connection.close();
    await connection.closed;
  },
);
