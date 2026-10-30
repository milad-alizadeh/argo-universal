// THROWAWAY SPIKE (#1488): advertises the Server over mDNS and opens a plain TCP echo port beside it.
import { createServer } from 'node:net';
import { Bonjour } from 'bonjour-service';

export const spikeBind = process.env.ARGO_SPIKE_BIND;

export function startSpikeAdvertising(port: number): void {
  if (!spikeBind) return;

  new Bonjour().publish({
    name: `argo-spike-${process.pid}`,
    type: 'argo',
    protocol: 'tcp',
    port,
  });

  // A raw TCP socket carries no HTTP, so Android's cleartext policy is never consulted for it.
  createServer((socket) => {
    socket.write('argo-spike-tcp-hello\n');
    socket.on('data', (data) => socket.write(data));
    socket.on('error', () => undefined);
  }).listen(port + 1, spikeBind);
}
