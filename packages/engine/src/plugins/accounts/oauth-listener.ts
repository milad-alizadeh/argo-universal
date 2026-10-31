import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';

const oauthPort = 51789;

// This listener is the owner's browser coming back from a sign-in on loopback, and nothing else: it accepts the two spellings of its own address. The tRPC API's own `Host` allowlist is gone, where the handshake is the gate instead (ADR-0045).
const callbackHostAllowed = (host: string | undefined): boolean =>
  host === `127.0.0.1:${oauthPort}` || host === `localhost:${oauthPort}`;

// Naming the port is how a person learns what to free; the Plugin shows this message.
export const portTakenMessage = `Port ${oauthPort} is already in use. Free the port, then try again.`;

export const redirectUri = `http://127.0.0.1:${oauthPort}/callback`;

const forbidden = 403;

const notFound = 404;

const invalidState = 400;

const complete = 200;

// The one line Argo serves on the callback; it holds nothing the request supplied.
const closeTabPage = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Argo</title>
<style>
html, body { height: 100%; margin: 0; }
body { display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: #fff; color: #0a0a0a; font: 14px/20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; }
</style>
</head>
<body>
<p>You can close this tab and return to Argo.</p>
</body>
</html>
`;

const pageHeaders = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
};

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
    if (!callbackHostAllowed(request.headers.host)) {
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

    response.writeHead(complete, pageHeaders).end(closeTabPage);
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
