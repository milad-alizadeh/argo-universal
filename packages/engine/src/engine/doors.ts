import { createServer, type Server as RequestServer } from 'node:http';
import type { Server } from 'node:net';
import { ChannelDoor } from '../pairing/channel-door';
import { createFrontDoor } from './front-door';
import type { RoutedSetup } from './http-server';
import type { RequestGuard } from './request-guard';
import { createRequestListener } from './request-listener';
import { SocketGuard } from './socket-guard';

export interface Doors {
  // The port every Device knocks on, which decides what each socket is before anything else reads it.
  readonly frontDoor: Server;
  // What serves an admitted socket, whether it came in on loopback or inside a channel.
  readonly requests: RequestServer;
}

// The Server's two doors: the channel for a paired Device, and plain HTTP for this computer's own App (ADR-0045).
export function createDoors(setup: RoutedSetup, guard: RequestGuard): Doors {
  const requests = createServer(createRequestListener(listening(setup, guard)));

  const { report } = guard;

  const channel = new ChannelDoor({
    staticKey: setup.staticKey,
    admission: setup.admission,
    serve: (socket): void => void requests.emit('connection', socket),
    report,
  });

  const unproven = new SocketGuard({ report });

  return {
    requests,
    frontDoor: createFrontDoor({ requests, channel, unproven, report }),
  };
}

const listening = (
  setup: RoutedSetup,
  guard: RequestGuard,
): Parameters<typeof createRequestListener>[0] => ({
  guard,
  blobsFolder: setup.blobsFolder,
  router: setup.appRouter,
  readAsset: setup.plugins.openAsset,
});
