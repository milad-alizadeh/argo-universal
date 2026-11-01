import { request, type RequestOptions } from 'node:http';
import type { Duplex } from 'node:stream';
import { createTRPCClient, httpLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import {
  connectChannel,
  type ChannelInput,
} from '../src/pairing/connect-channel';

type ChannelFetch = NonNullable<Parameters<typeof httpLink>[0]['fetch']>;

type FetchInit = Parameters<ChannelFetch>[1];

/*
 * A tRPC client whose every call opens its own channel, runs the shipped handshake on it and sends the request inside (ADR-0045).
 * A paired Device would hold one channel open instead; a fresh one per call is what makes each test exercise the handshake rather than a Connection some earlier call opened.
 */
export const callerOverChannel = (input: ChannelInput): TRPCClient<AppRouter> =>
  createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `http://${input.address.host}:${input.address.port}/trpc`,
        fetch: channelFetch(input),
      }),
    ],
  });

/*
 * One GET for a path on the Server, sent inside a fresh channel: how a paired Device reads a Blob or a Plugin asset (ADR-0045).
 */
export async function getOverChannel(
  input: ChannelInput,
  path: string,
): Promise<Response> {
  const { socket } = await connectChannel(input);
  const url = `http://${input.address.host}:${input.address.port}${path}`;
  const response = await answerOver(socket, url, {});

  socket.destroy();

  return response;
}

const channelFetch =
  (input: ChannelInput): ChannelFetch =>
  async (url, init) => {
    const { socket } = await connectChannel(input);
    const response = await answerOver(socket, String(url), init);
    socket.destroy();

    return response;
  };

function answerOver(
  socket: Duplex,
  url: string,
  init: FetchInit,
): Promise<Response> {
  return new Promise<Response>((resolve, reject): void => {
    const answered = (incoming: NodeJS.ReadableStream): void => {
      resolve(answer(incoming));
    };

    const outgoing = request(url, requestOptions(socket, init), answered);

    outgoing.once('error', reject);
    outgoing.end(init?.body ?? undefined);
  });
}

/*
 * No agent at all: Node only honours `createConnection` when there is none, and an agent of its own would open a second, plain TCP connection beside the channel.
 */
const requestOptions = (socket: Duplex, init: FetchInit): RequestOptions => ({
  method: init?.method ?? 'GET',
  headers: requestHeaders(init),
  createConnection: (): Duplex => socket,
});

const requestHeaders = (init: FetchInit): Record<string, string> =>
  Object.fromEntries(Object.entries(init?.headers ?? {}).map(asHeader));

const asHeader = ([name, value]: [string, unknown]): [string, string] => [
  name,
  String(value),
];

async function answer(incoming: NodeJS.ReadableStream): Promise<Response> {
  const body: Buffer[] = [];

  for await (const chunk of incoming) body.push(Buffer.from(chunk));

  return new Response(Buffer.concat(body), { status: statusOf(incoming) });
}

const statusOf = (incoming: NodeJS.ReadableStream): number =>
  'statusCode' in incoming && typeof incoming.statusCode === 'number'
    ? incoming.statusCode
    : 0;
