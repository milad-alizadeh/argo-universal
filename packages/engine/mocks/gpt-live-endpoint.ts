import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  answer,
  bearerOf,
  callRequestOf,
  hasAlpha,
  recordOf,
  refused,
  wordsOf,
  type CreatedCall,
  type Reply,
} from './gpt-live-call-request';
import { sentMessageOf, type SentMessage } from './gpt-live-link-message';

export type { CreatedCall } from './gpt-live-call-request';

export type FakeEndpointOptions = {
  // Tokens the call-creation endpoint accepts; any other bearer token is rejected with 401.
  accepts: string[];
  // Tokens the control link accepts; the same as `accepts` when left out.
  linkAccepts?: string[];
  // The SDP answer the call is created with.
  answer?: string;
  callId?: string;
};

/*
 * A local stand-in for the GPT-Live service: the call-creation POST and the control-link WebSocket.
 * Tests reply with recorded events (`gpt-live-frames.ts`) through `send`; nothing here reaches the live service.
 */
export class FakeGptLiveEndpoint {
  public readonly created: CreatedCall[] = [];
  public readonly received: SentMessage[] = [];
  public readonly links: WebSocket[] = [];
  public readonly linkTokens: (string | undefined)[] = [];
  // While true the service turns every control link away, as when it is down.
  public refuseLinks = false;
  // While true the service no longer knows the call and answers a link with 404, as after it ended the call itself.
  public callGone = false;
  // While true the service answers no ping, as a link gone quiet without closing.
  public silent = false;
  private readonly http: Server;
  private readonly sockets = new WebSocketServer({
    noServer: true,
    autoPong: false,
  });
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

  // Sends a raw binary frame, as audio travels, down the control link.
  public sendAudio(payload: Buffer): void {
    this.link().send(payload, { binary: true });
  }

  // The service loses the link without a word.
  public dropLink(): void {
    this.link().terminate();
  }

  // Ends every link and both servers, and waits until they are gone.
  public async close(): Promise<void> {
    for (const link of this.links) link.terminate();
    await new Promise<void>((resolve) => this.sockets.close(() => resolve()));
    this.http.closeAllConnections();
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }

  private link(): WebSocket {
    const link = this.links.at(-1);

    if (!link) throw new Error('No control link joined');

    return link;
  }

  private linksAccept(request: IncomingMessage): boolean {
    const accepted = this.options.linkAccepts ?? this.options.accepts;

    return !this.refuseLinks && this.accepts(request, accepted);
  }

  private accepts(request: IncomingMessage, accepted: string[]): boolean {
    const token = bearerOf(request);

    return token !== undefined && accepted.includes(token);
  }

  private upgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): void {
    this.linkTokens.push(bearerOf(request));
    const refusal = this.linkRefusal(request);

    if (refusal) return void socket.end(`HTTP/1.1 ${refusal}\r\n\r\n`);
    this.sockets.handleUpgrade(request, socket, head, (link) =>
      this.join(link),
    );
  }

  // The service refuses a link without the alpha header the call was created with (#2406 probe, 2026-11-19).
  private linkRefusal(request: IncomingMessage): string | undefined {
    const refusals: [boolean, string][] = [
      [!hasAlpha(request), '400 Bad Request'],
      [this.callGone, '404 Not Found'],
      [!this.linksAccept(request), '401 Unauthorized'],
    ];

    return refusals.find(([refusing]) => refusing)?.[1];
  }

  private join(link: WebSocket): void {
    this.links.push(link);
    link.on('ping', (data) => {
      if (!this.silent) link.pong(data);
    });
    link.on('message', (data, binary) => this.record(wordsOf(data, binary)));
  }

  // A message not in the shape Codex sends is dropped, as the service would not understand it.
  private record(words: string): void {
    const message = sentMessageOf(words);

    if (message) this.received.push(message);
  }

  // The service refuses a call without the alpha header, as it refuses such a link, and one without an accepted token.
  private creationRefusal(request: IncomingMessage): Reply | null {
    if (!hasAlpha(request)) return refused(400, 'missing openai-alpha');

    if (!this.accepts(request, this.options.accepts))
      return refused(401, 'unauthorized');

    return null;
  }

  private async create(request: IncomingMessage): Promise<Reply> {
    const refusal = this.creationRefusal(request);

    if (refusal) return refusal;
    const form = await callRequestOf(request);

    if (!form) return refused(400, 'bad call request');
    this.created.push(recordOf(request, form));

    return this.createdReply();
  }

  private createdReply(): Reply {
    const { callId = 'call_1', answer: body = 'v=0 answer' } = this.options;

    return {
      status: 201,
      headers: {
        Location: `/v1/live/${callId}`,
        'Content-Type': 'application/sdp',
      },
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
