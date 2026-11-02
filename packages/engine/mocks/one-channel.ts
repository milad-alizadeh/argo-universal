import { Agent, request, type IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createTRPCClient, httpLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import type { ChannelInput } from '../src/pairing/connect-channel';
import { answerOver, type ChannelFetch } from './channel-fetch';

export interface OneChannel {
  caller: TRPCClient<AppRouter>;
  // Opens a subscription as one more request on the same channel and answers the head of its response; the stream stays open until `close`.
  subscribe: (path: string) => Promise<IncomingMessage>;
  close: () => void;
}

// The one socket every request of the agent travels on, kept alive between them the way a paired Device's channel is.
const agentOn = (socket: Duplex): Agent =>
  new (class extends Agent {
    public override createConnection(): Duplex {
      return socket;
    }
  })({ keepAlive: true, maxSockets: 1 });

const streamOver = (url: string, agent: Agent): Promise<IncomingMessage> =>
  new Promise<IncomingMessage>((resolve, reject): void => {
    const outgoing = request(
      url,
      { agent, headers: { accept: 'text/event-stream' } },
      resolve,
    );

    outgoing.once('error', reject);
    outgoing.end();
  });

const fetchOn =
  (agent: Agent): ChannelFetch =>
  (url, init) =>
    answerOver(String(url), init, { agent });

/*
 * A tRPC client whose every call travels on the one channel it is given, as a paired Device's does for its whole run, where `callerOverChannel` opens a new one per call.
 * The requests take turns on the one socket, because HTTP/1.1 carries one at a time: a subscription holds it until it is closed.
 */
export function overOneChannel(
  input: ChannelInput,
  socket: Duplex,
): OneChannel {
  const agent = agentOn(socket);
  const base = `http://${input.address.host}:${input.address.port}`;

  return {
    caller: createTRPCClient<AppRouter>({
      links: [httpLink({ url: `${base}/trpc`, fetch: fetchOn(agent) })],
    }),
    subscribe: (path) => streamOver(`${base}${path}`, agent),
    close: (): void => void socket.destroy(),
  };
}
