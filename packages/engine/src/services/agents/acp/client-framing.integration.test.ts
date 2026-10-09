import { expect, it } from 'vitest';
import { createAcpPeer } from '#mocks/acp-peer';
import { createAgentClient } from './client';

it.each([
  { label: 'invalid JSON', frame: '{', code: -32700 },
  { label: 'invalid envelope', frame: '42', code: -32600 },
])(
  'returns an SDK framing error for $label without another decoder',
  async ({ frame, code }) => {
    const peer = createAcpPeer();
    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: () => {},
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });
    await peer.sendRaw(frame);
    expect(await peer.receive()).toEqual(
      expect.objectContaining({
        jsonrpc: '2.0',
        id: null,
        error: expect.objectContaining({ code }),
      }),
    );
    connection.close();
    await connection.closed;
  },
);
