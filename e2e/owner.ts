import { AppPageSocket } from '@repo/engine/mocks/app-socket';
import type {
  ChannelTestHost,
  TestDevice,
} from '@repo/engine/mocks/engine-channel';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';

type Client = TestDevice['caller'];

type RouterOf<Caller> =
  Caller extends TRPCClient<infer Router> ? Router : never;

type Registration =
  Awaited<
    ReturnType<ChannelTestHost['caller']['pairing']['registered']>
  > extends AsyncIterable<infer Each>
    ? Each
    : never;

/*
 * The owner at the Server's computer: a Connection on its loopback address from the page's own Origin, which is what makes it the Server Device (#1696).
 * The pair sheet's work (mint a Pairing Ticket, hear a Device ask, press Allow) is done through it, since no browser is ever offered pairing.
 */
export type Owner = {
  client: Client;
  close: () => void;
};

export function connectOwner(serverUrl: string): Owner {
  const socket = createWSClient({
    url: serverUrl,
    WebSocket: AppPageSocket,
    retryDelayMs: () => 0,
  });

  return {
    client: createTRPCClient<RouterOf<Client>>({
      links: [wsLink({ client: socket })],
    }),
    close: () => void socket.close(),
  };
}

// What the owner hears first when a Device asks to pair, with the subscription already open so no registration is missed.
export type Asking = {
  first: Promise<Registration>;
  stop: () => void;
};

export function watchForDevice(owner: Owner): Promise<Asking> {
  const first = Promise.withResolvers<Registration>();

  return new Promise<Asking>((started, failed): void => {
    const subscription = owner.client.pairing.registered.subscribe(undefined, {
      onStarted: () => started(asking(first.promise, subscription)),
      onData: first.resolve,
      onError: (error) => {
        first.reject(error);
        failed(error);
      },
    });
  });
}

const asking = (
  first: Promise<Registration>,
  subscription: { unsubscribe: () => void },
): Asking => ({ first, stop: () => subscription.unsubscribe() });

// The one registration the owner is asked about, as the stream the channel client waits on.
export const onlyOne = <T>(first: Promise<T>): AsyncIterable<T> => ({
  [Symbol.asyncIterator]: () => ({
    next: async () => ({ done: false, value: await first }),
  }),
});
