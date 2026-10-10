import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream } from '@agentclientprotocol/sdk';

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
  .onRequest('session/new', () => ({ sessionId: String(process.pid) }))
  .onRequest('session/close', () => ({}))
  .connect(
    ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)),
  );
