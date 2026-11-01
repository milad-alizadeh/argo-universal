import { request, type RequestOptions } from 'node:http';
import type { Duplex } from 'node:stream';
import { createTRPCClient, httpLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import {
  connectChannel,
  type ChannelInput,
} from '../src/pairing/connect-channel';

export type ChannelFetch = NonNullable<Parameters<typeof httpLink>[0]['fetch']>;

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
  const response = await answerOver(url, {}, connectionOn(socket));

  socket.destroy();

  return response;
}

/*
 * What the Server answers a request the tRPC client will not send: `httpLink` refuses a subscription in the App, so a test that wants the Server's own answer has to ask over the channel itself.
 */
export async function answerOverChannel(
  input: ChannelInput,
  url: string,
  init: FetchInit,
): Promise<string> {
  const { socket } = await connectChannel(input);
  const answered = await answerOver(url, init, connectionOn(socket));
  socket.destroy();

  return answered.text();
}

const channelFetch =
  (input: ChannelInput): ChannelFetch =>
  async (url, init) => {
    const { socket } = await connectChannel(input);
    const response = await answerOver(String(url), init, connectionOn(socket));
    socket.destroy();

    return response;
  };

export type Connection = Pick<RequestOptions, 'agent' | 'createConnection'>;

/*
 * No agent at all: Node only honours `createConnection` when there is none, and an agent of its own would open a second, plain TCP connection beside the channel.
 */
export const connectionOn = (socket: Duplex): Connection => ({
  createConnection: (): Duplex => socket,
});

// One request, sent on whatever connection it is given, and the whole of its answer.
export function answerOver(
  url: string,
  init: FetchInit,
  connection: Connection,
): Promise<Response> {
  return new Promise<Response>((resolve, reject): void => {
    const outgoing = request(
      url,
      requestOptions(init, connection),
      (incoming) => resolve(answer(incoming)),
    );

    outgoing.once('error', reject);
    outgoing.end(bodyOf(init));
  });
}

const bodyOf = (init: FetchInit): NonNullable<FetchInit>['body'] =>
  init?.body ?? undefined;

const requestOptions = (
  init: FetchInit,
  connection: Connection,
): RequestOptions => ({
  method: init?.method ?? 'GET',
  headers: requestHeaders(init),
  ...connection,
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
