import { sha1 } from '@noble/hashes/legacy.js';
import { bytesBase64, textBytes } from './bytes';
import type { HttpResponseHead } from './http-exchange';

// RFC 6455's fixed string, which both sides hash with the client's key to show the upgrade was meant.
const handshakeGuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const switchingProtocols = 101;

export const upgradeRequest = (path: string, key: string): string =>
  [
    `GET ${path} HTTP/1.1`,
    'Host: argo',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${key}`,
    'Sec-WebSocket-Version: 13',
    '',
    '',
  ].join('\r\n');

// What the Server must answer with for this key.
export const acceptFor = (key: string): string =>
  bytesBase64(sha1(textBytes(key + handshakeGuid)));

// The Server agreed to switch, and proved it read this request's key.
export const upgraded = (head: HttpResponseHead, accept: string): boolean =>
  head.status === switchingProtocols &&
  head.headers.get('sec-websocket-accept') === accept;
