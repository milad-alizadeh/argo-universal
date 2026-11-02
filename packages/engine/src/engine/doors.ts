import { createServer, type Server as RequestServer } from 'node:http';
import type { Server } from 'node:net';
import { ChannelDoor } from '../pairing/channel-door';
import { KeyDoor } from '../pairing/key-door';
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

// The Server's doors: the channel for a paired Device, the key a typed code asks for, and plain HTTP for this computer's own App (ADR-0045).
export function createDoors(setup: RoutedSetup, guard: RequestGuard): Doors {
  const requests = createServer(createRequestListener(listening(setup, guard)));
  const { report } = guard;

  return {
    requests,
    frontDoor: createFrontDoor({
      requests,
      channel: channelDoor(setup, requests, report),
      key: keyDoor(setup, report),
      unproven: new SocketGuard({ report }),
      report,
    }),
  };
}

const keyDoor = (setup: RoutedSetup, report: RequestGuard['report']): KeyDoor =>
  new KeyDoor({
    publicKey: setup.staticKey.publicKey,
    offering: (source) => setup.tickets.offering(source),
    settled: (source, proved) => setup.tickets.settled(source, proved),
    report,
  });

const channelDoor = (
  setup: RoutedSetup,
  requests: RequestServer,
  report: RequestGuard['report'],
): ChannelDoor =>
  new ChannelDoor({
    staticKey: setup.staticKey,
    admission: setup.admission,
    channels: setup.channels,
    serve: (socket): void => void requests.emit('connection', socket),
    report,
  });

const listening = (
  setup: RoutedSetup,
  guard: RequestGuard,
): Parameters<typeof createRequestListener>[0] => ({
  guard,
  blobsFolder: setup.blobsFolder,
  router: setup.appRouter,
  readAsset: setup.plugins.openAsset,
});
