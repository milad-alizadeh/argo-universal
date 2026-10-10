import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream } from '@agentclientprotocol/sdk';

let opened = 0;
agent()
  .onRequest('initialize', () => ({
    protocolVersion: 1,
    agentCapabilities: { sessionCapabilities: { close: {} } },
    _meta: {
      present: process.env.ARGO_348_PRESENT,
      ambient: process.env.ARGO_348_AMBIENT ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  }))
  .onRequest('session/new', () => {
    opened += 1;
    return { sessionId: `${process.pid}:${opened}` };
  })
  .onRequest('session/close', () => ({}))
  .onRequest('session/prompt', async ({ params, client }) => {
    const [block] = params.prompt;
    const oversized = block?.type === 'text' && block.text === 'Oversized';
    await client.notify('session/update', {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: {
          type: 'text',
          text: oversized ? 'x'.repeat(32 * 1024 * 1024) : params.sessionId,
        },
      },
    });
    return { stopReason: 'end_turn' };
  })
  .connect(
    ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)),
  );
