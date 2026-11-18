import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { Socket } from 'node:net';
import { text } from 'node:stream/consumers';
import { WebSocketServer, type WebSocket } from 'ws';
import { z } from 'zod';
import { textOfFrame } from '../src/voice/gpt-live/link-events';

// A recorded call-creation request, as the fake endpoint saw it.
export type CreatedCall = {
  authorization: string | undefined;
  alpha: string | undefined;
  url: string;
  body: string;
};

export type FakeEndpointOptions = {
  // Tokens the endpoint accepts; any other bearer token is rejected with 401.
  accepts: string[];
  // The SDP answer the call is created with.
  answer?: string;
  callId?: string;
};

type Reply = { status: number; headers: Record<string, string>; body: string };

// What the control link carries out of a call: flat text fields.
const sentMessage = z.record(z.string(), z.string());

const unauthorized: Reply = { status: 401, headers: {}, body: 'unauthorized' };

const bearerOf = (request: IncomingMessage): string | undefined =>
  request.headers.authorization?.replace(/^Bearer /, '');

async function recordOf(request: IncomingMessage): Promise<CreatedCall> {
  return {
    authorization: request.headers.authorization,
    alpha: request.headers['openai-alpha']?.toString(),
    url: request.url ?? '',
    body: await text(request),
  };
}

function answer(response: ServerResponse, reply: Reply): void {
  response.writeHead(reply.status, reply.headers);
  response.end(reply.body);
}

/*
 * A local stand-in for the GPT-Live service: the call-creation POST and the control-link WebSocket.
 * Tests reply with recorded events through `send`; nothing here reaches the live service.
 */
export class FakeGptLiveEndpoint {
  public readonly created: CreatedCall[] = [];
  public readonly received: Record<string, string>[] = [];
  public readonly links: WebSocket[] = [];
  public readonly linkTokens: (string | undefined)[] = [];
  // While true the service turns every control link away, as when it is down.
  public refuseLinks = false;
  private readonly http: Server;
  private readonly sockets = new WebSocketServer({ noServer: true });
  private port = 0;

  public constructor(private readonly options: FakeEndpointOptions) {
    this.http = createServer(
      (request, response) =>
        void this.create(request).then((reply) => answer(response, reply)),
    );
    this.http.on('upgrade', (request, socket, head) =>
      this.upgrade(request, socket, head),
    );
  }

  public async listen(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.http.listen(0, '127.0.0.1', resolve),
    );
    const address = this.http.address();
    this.port = typeof address === 'object' && address ? address.port : 0;
  }

  public get httpBase(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  public get linkBase(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  // Sends one recorded event, as its JSON text, down the control link.
  public send(frame: string): void {
    this.link().send(frame);
  }

  // Sends a raw audio frame down the control link.
  public sendAudio(): void {
    this.link().send(Buffer.from([1, 2, 3, 4]), { binary: true });
  }

  // The service loses the link without a word.
  public dropLink(): void {
    this.link().terminate();
  }

  public async close(): Promise<void> {
    for (const link of this.links) link.terminate();
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  private link(): WebSocket {
    const link = this.links.at(-1);

    if (!link) throw new Error('No control link joined');

    return link;
  }

  private accepts(token: string | undefined): boolean {
    return token !== undefined && this.options.accepts.includes(token);
  }

  private upgrade(
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): void {
    const token = bearerOf(request);
    this.linkTokens.push(token);

    if (this.refuseLinks || !this.accepts(token))
      return void socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');

    this.sockets.handleUpgrade(request, socket, head, (link) =>
      this.join(link),
    );
  }

  private join(link: WebSocket): void {
    this.links.push(link);
    link.on('message', (data, binary) => {
      const frame = textOfFrame(data, binary);

      if (frame) this.received.push(sentMessage.parse(JSON.parse(frame)));
    });
  }

  private async create(request: IncomingMessage): Promise<Reply> {
    this.created.push(await recordOf(request));

    return this.accepts(bearerOf(request)) ? this.createdReply() : unauthorized;
  }

  private createdReply(): Reply {
    const { callId = 'call_1', answer: body = 'v=0 answer' } = this.options;

    return {
      status: 201,
      headers: { Location: `/v1/live/${callId}` },
      body,
    };
  }
}

export async function startFakeEndpoint(
  options: FakeEndpointOptions,
): Promise<FakeGptLiveEndpoint> {
  const endpoint = new FakeGptLiveEndpoint(options);
  await endpoint.listen();

  return endpoint;
}
