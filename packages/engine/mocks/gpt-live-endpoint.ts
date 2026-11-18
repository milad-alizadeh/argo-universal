import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';

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

function bearerOf(request: IncomingMessage): string | undefined {
  return request.headers.authorization?.replace(/^Bearer /, '');
}

/*
 * A local stand-in for the GPT-Live service: the call-creation POST and the control-link WebSocket.
 * Tests reply with recorded events through `send`; nothing here reaches the live service.
 */
export class FakeGptLiveEndpoint {
  public readonly created: CreatedCall[] = [];
  public readonly received: Record<string, unknown>[] = [];
  public readonly links: WebSocket[] = [];
  public readonly linkTokens: (string | undefined)[] = [];
  private readonly http: Server;
  private readonly sockets: WebSocketServer;
  // While true the service turns every control link away, as when it is down.
  public refuseLinks = false;
  private port = 0;

  public constructor(private readonly options: FakeEndpointOptions) {
    this.sockets = new WebSocketServer({ noServer: true });
    this.http = createServer((request, response) => {
      void this.create(request).then(({ status, headers, body }) => {
        response.writeHead(status, headers);
        response.end(body);
      });
    });
    this.http.on('upgrade', (request, socket, head) => {
      const token = bearerOf(request);
      this.linkTokens.push(token);

      if (this.refuseLinks || !token || !this.options.accepts.includes(token)) {
        socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');

        return;
      }

      this.sockets.handleUpgrade(request, socket, head, (link) => {
        this.links.push(link);
        link.on('message', (data, binary) => {
          if (!binary)
            this.received.push(
              JSON.parse(data.toString()) as Record<string, unknown>,
            );
        });
      });
    });
  }

  public async listen(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.http.listen(0, '127.0.0.1', resolve),
    );
    this.port = (this.http.address() as AddressInfo).port;
  }

  public get httpBase(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  public get linkBase(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  public get link(): WebSocket {
    const link = this.links.at(-1);

    if (!link) throw new Error('No control link joined');

    return link;
  }

  // Sends one recorded event down the control link.
  public send(event: Record<string, unknown>): void {
    this.link.send(JSON.stringify(event));
  }

  // Sends a raw audio frame down the control link.
  public sendAudio(): void {
    this.link.send(Buffer.from([1, 2, 3, 4]), { binary: true });
  }

  // The service loses the link without a word.
  public dropLink(): void {
    this.link.terminate();
  }

  public async close(): Promise<void> {
    for (const link of this.links) link.terminate();
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  private async create(request: IncomingMessage): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }> {
    const chunks: Buffer[] = [];

    for await (const chunk of request) chunks.push(chunk as Buffer);
    const token = bearerOf(request);
    this.created.push({
      authorization: request.headers.authorization,
      alpha: request.headers['openai-alpha'] as string | undefined,
      url: request.url ?? '',
      body: Buffer.concat(chunks).toString(),
    });

    if (!token || !this.options.accepts.includes(token))
      return { status: 401, headers: {}, body: 'unauthorized' };

    return {
      status: 201,
      headers: { Location: `/v1/live/${this.options.callId ?? 'call_1'}` },
      body: this.options.answer ?? 'v=0 answer',
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
