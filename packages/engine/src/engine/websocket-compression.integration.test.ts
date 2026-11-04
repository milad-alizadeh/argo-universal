import type { Socket } from 'node:net';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket as NodeWebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';
import type { AppRouter } from './router';

type Wire = { agreed?: string; tcp?: Socket };

const surface = currentPluginSurface('desktop');

// A Project id long and repetitive enough that the page the fixture draws from it is well over the size the Server compresses.
const projectId = 'project-'.repeat(4000);

/*
 * The `ws` client offers permessage-deflate as the App's browsers and OkHttp do, and shows what was agreed and how many bytes crossed the TCP socket.
 * It stands in for the App's page, so it sends that page's Origin.
 */
const recordingSocket = (wire: Wire): typeof WebSocket =>
  new Proxy(WebSocket, {
    construct: (_socket, [url]): NodeWebSocket => {
      const socket = new NodeWebSocket(String(url), {
        headers: { origin: 'app://app' },
      });

      socket.once('upgrade', (response): void => {
        wire.agreed = response.headers['sec-websocket-extensions'];
        wire.tcp = response.socket;
      });

      return socket;
    },
  });

// Draws the page over the WebSocket, as the App's page does.
function drawPage(url: string, wire: Wire): Promise<DrawAnswer> {
  const client = createWSClient({
    url: url.replace(/^http/, 'ws'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
    WebSocket: recordingSocket(wire),
  });

  onTestFinished(() => client.close());

  return createTRPCClient<AppRouter>({
    links: [wsLink({ client })],
  }).plugins.draw.query({
    pluginId: 'surface',
    path: '/',
    pageState: {},
    projectId,
    pages: 1,
  });
}

function drawn(answer: DrawAnswer): string | null {
  return answer.kind === 'tree' ? text(answer.root) : null;
}

function text(root: WireNode): string | null {
  const children = root.props['children'];

  return typeof children === 'string' ? children : null;
}

const expectedPage = JSON.stringify({ ...surface, projectId, frozen: true });

it('agrees permessage-deflate at the handshake and delivers a large page intact in fewer bytes', async (): Promise<void> => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { url } = await startEngineTestHost({ home });
  const wire: Wire = {};

  expect(drawn(await drawPage(url, wire))).toBe(expectedPage);
  expect(wire.agreed).toBe(
    'permessage-deflate; server_no_context_takeover; client_no_context_takeover',
  );
  expect(wire.tcp?.bytesRead).toBeLessThan(expectedPage.length / 4);
}, 20_000);
