import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream } from '@agentclientprotocol/sdk';

agent()
  .onRequest('initialize', () => ({
    protocolVersion: 1,
    agentCapabilities: { sessionCapabilities: { close: {} } },
  }))
  .onRequest('session/new', () => ({ sessionId: String(process.pid) }))
  .onRequest('session/close', () => ({}))
  .connect(
    ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)),
  );
