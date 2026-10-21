import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { requestHostAllowed } from '../../rpc/request-host';

export const oauthPort = 51789;

export const redirectUri = `http://127.0.0.1:${oauthPort}/callback`;

const forbidden = 403;

const notFound = 404;

const invalidState = 400;

const complete = 204;

type Callback = (code: string | null) => void;

type Active = { server: Server; ready: Promise<boolean> };

// Closing a listener waits for its bind, and the next bind waits for that close.
export class OAuthListener {
  private active?: Active;
  private closing: Promise<void> = Promise.resolve();
  constructor(
    private readonly lookup: (state: string) => Callback | undefined,
    private readonly log: (line: string) => void,
  ) {}

  listen(): Promise<boolean> {
    if (this.active) return this.active.ready;

    const server = createServer((request, response) =>
      this.callback(request, response),
    );

    const ready = this.closing.then(() => bind(server, this.log));
    this.active = { server, ready };

    return ready;
  }

  close(): void {
    const active = this.active;

    if (!active) return;
    this.active = undefined;
    this.closing = active.ready.then(() => closeServer(active.server));
  }

  private callback(request: IncomingMessage, response: ServerResponse): void {
    if (!requestHostAllowed(oauthPort, request.headers.host)) {
      response.writeHead(forbidden).end();

      return;
    }

    const query = callbackQuery(request);

    if (!query) {
      response.writeHead(notFound).end();

      return;
    }

    this.answer(query, response);
  }

  private answer(query: URLSearchParams, response: ServerResponse): void {
    const settle = this.lookup(callbackState(query));

    if (!settle) {
      response.writeHead(invalidState).end();

      return;
    }

    // The designed close-tab document remains pending #1166.
    response.writeHead(complete).end();
    settle(query.has('error') ? null : query.get('code'));
  }
}

function callbackQuery(request: IncomingMessage): URLSearchParams | null {
  if (request.method !== 'GET') return null;

  return callbackParams(callbackUrl(request));
}

const callbackParams = (url: URL | null): URLSearchParams | null =>
  url?.pathname === '/callback' ? url.searchParams : null;

function bind(server: Server, log: (line: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    server.once('error', (error) => {
      log(`OAuth callback port ${oauthPort} is unavailable: ${error.message}`);
      resolve(false);
    });
    server.listen(oauthPort, '127.0.0.1', () => resolve(true));
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
}

const callbackState = (query: URLSearchParams): string =>
  query.get('state') ?? '';

function callbackUrl(request: IncomingMessage): URL | null {
  const target = request.url ?? '/';

  return URL.canParse(target, redirectUri)
    ? new URL(target, redirectUri)
    : null;
}
