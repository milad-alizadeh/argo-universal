# Hono for the Server's plain HTTP routes

Research for serving `GET /health` and `GET /blobs/:id` with Hono in `apps/server/src/worker/`, while tRPC stays on the one WebSocket (`ws` with `applyWSSHandler`) on the same port (`docs/adr/0002-a-local-server-owns-all-machine-work.md`, spec `docs/specs/0001-scaffold.md` section 5). Checked on 2026-10-03.

Source facts come from the npm registry, the tagged sources of `honojs/hono` (`v4.13.12`) and `honojs/node-server` (`v2.1.3`), and the hono.dev docs. Nothing was installed for this note. The Hono snippets below follow the read source but were **not compiled or run**. The `ws` and Node facts marked "checked" were run on Node 24.21.0 with the repo's installed `ws` 8.22.0 [S26].

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry, `hono` | https://www.npmjs.com/package/hono (via `npm view`) | Version, dist-tags, engines, exports, no dependencies |
| S2 | npm registry, `@hono/node-server` | https://www.npmjs.com/package/@hono/node-server (via `npm view`) | Version, peer `hono ^4`, engines `node >=20`, ESM exports |
| S3 | npm registry, `@hono/node-ws`, `@hono/zod-validator`, `@hono/standard-validator`, `@hono/trpc-server` | https://www.npmjs.com/org/hono (via `npm view`) | Versions and peers |
| S4 | `@hono/node-server` README (v2.1.3) | https://github.com/honojs/node-server/blob/v2.1.3/README.md | `serve`, `createAdaptorServer`, `websocket` option, `overrideGlobalObjects`, `serveStatic` |
| S5 | `src/server.ts` (v2.1.3) | https://github.com/honojs/node-server/blob/v2.1.3/src/server.ts | What `serve` and `createAdaptorServer` do |
| S6 | `src/listener.ts`, `request.ts`, `url.ts`, `headers.ts`, `utils.ts`, `types.ts` (v2.1.3) | https://github.com/honojs/node-server/tree/v2.1.3/src | `getRequestListener`, Host to URL, 400 on a bad Host, headers, streaming, `ServerType` |
| S7 | `src/websocket.ts`, `websocket-types.ts` (v2.1.3) | https://github.com/honojs/node-server/blob/v2.1.3/src/websocket.ts | Built-in `upgradeWebSocket` and how it drives a `noServer` `WebSocketServer` |
| S8 | `src/serve-static.ts`, `src/utils/stream.ts` (v2.1.3) | https://github.com/honojs/node-server/blob/v2.1.3/src/serve-static.ts | `serveStatic` behaviour; `Readable.toWeb` on Node 24 |
| S9 | `@hono/node-server` releases v2.0.0, v2.0.10, v2.1.3 | https://github.com/honojs/node-server/releases | Built-in WebSocket (v2.0.0), upgrade memory-leak fix (v2.0.10), `serveStatic` path fix (v2.1.3) |
| S10 | `@hono/node-ws` README | https://github.com/honojs/middleware/blob/main/packages/node-ws/README.md | Deprecated in favour of node-server v2 |
| S11 | `src/hono-base.ts` (v4.13.12) | https://github.com/honojs/hono/blob/v4.13.12/src/hono-base.ts | Default 404 and 500, HEAD dispatched to GET, `app.request` |
| S12 | `src/context.ts` (v4.13.12) and `dist/types/context.d.ts` | https://github.com/honojs/hono/blob/v4.13.12/src/context.ts | `c.json` content type, `c.body` accepts `ReadableStream` |
| S13 | `src/helper/streaming/stream.ts` (v4.13.12) | https://github.com/honojs/hono/blob/v4.13.12/src/helper/streaming/stream.ts | `stream()` returns the response before the callback runs |
| S14 | `src/middleware/` listing and `csrf/index.ts` (v4.13.12) | https://github.com/honojs/hono/tree/v4.13.12/src/middleware | No Host middleware; `csrf` skips GET |
| S15 | `src/middleware/method-not-allowed/index.ts` (v4.13.12) | https://github.com/honojs/hono/blob/v4.13.12/src/middleware/method-not-allowed/index.ts | 405 only for a known path, HEAD allowed; added in 4.13.0 |
| S16 | `src/request.ts` (v4.13.12) | https://github.com/honojs/hono/blob/v4.13.12/src/request.ts | `c.req.param()` runs `decodeURIComponent` |
| S17 | hono.dev, Node.js | https://hono.dev/docs/getting-started/nodejs (source: honojs/website `docs/getting-started/nodejs.md`) | Supported Node versions, closing the server, WebSocket, `@hono/node-ws` deprecated |
| S18 | hono.dev, Testing | https://hono.dev/docs/guides/testing | `app.request(...)` |
| S19 | hono.dev, Next.js | https://hono.dev/docs/getting-started/nextjs | `getRequestListener(app.fetch)` as a documented API |
| S20 | `@hono/zod-validator` and `@hono/standard-validator` source (main) | https://github.com/honojs/middleware/tree/main/packages | Default failure is 400; hooks |
| S21 | tRPC `adapters/ws.ts` (11.19.0, installed `src/`) | https://github.com/trpc/trpc/blob/v11.19.0/packages/server/src/adapters/ws.ts | `wss: ws.WebSocketServer`, listens on `'connection'` |
| S22 | tRPC WebSockets docs and `examples/standalone-server/src/server.ts` | https://trpc.io/docs/server/websockets | `new WebSocketServer({ server })` beside an HTTP handler |
| S23 | `ws` 8.22.0 `doc/ws.md` | https://github.com/websockets/ws/blob/8.22.0/doc/ws.md | `verifyClient` discouraged; `close()` leaves connections open |
| S24 | `@types/node` 24.19.1 `web-globals/*.d.ts` (installed) | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node | Which web types exist without the DOM lib |
| S25 | Node.js 24 `http` docs | https://nodejs.org/api/http.html | `requireHostHeader` default, `server.close()` closes idle connections |
| S26 | Local checks (this research) | scratchpad, not in repo | Node 24.21.0: `Request` keeps `Host`; `server.close()` waits for live `ws` clients; `listen` rejects with `EADDRINUSE` |

## Versions

Checked 2026-10-03 with `npm view <pkg> version dist-tags peerDependencies engines --json` [S1, S2, S3].

| Package | Newest stable | Published | Engines | Peers | Notes |
|---|---|---|---|---|---|
| `hono` | **4.13.12** | 2026-09-30 | `node >=16.9.0` | none | No dependencies. ESM (`"type": "module"`) with CJS fallback; `types` condition on every subpath. Tags: `next` 4.5.0-rc.2 and `v4` 4.0.0-rc.4 are old; ignore them. |
| `@hono/node-server` | **2.1.3** | 2026-09-29 | `node >=20` | `hono ^4` | No dependencies. ESM with `.d.mts` types. `latest-1` is 1.19.17 (the v1 line). |
| `@hono/node-ws` | 1.3.1 | 2026-05 | `node >=18.14.1` | `@hono/node-server ^1.19.11`, `hono ^4.6.0` | **Deprecated** [S10]; its peer does not accept node-server 2. |
| `@hono/zod-validator` | 0.9.1 | 2026-08-31 | none | `zod ^3.25.0 \|\| ^4.0.0`, `hono >=4.11.2` | Not needed (see point 6). |
| `@hono/standard-validator` | 0.4.0 | 2026-08-05 | none | `@standard-schema/spec ^1.0.0`, `hono >=4.11.2` | Not needed. |
| `@hono/trpc-server` | 0.4.2 | | | `@trpc/server`, `hono >=4` | HTTP tRPC adapter. Out of scope: ADR 0002 keeps tRPC on the WebSocket. |

- Node: the repo runs Node 24.21.0 (`engines: 24.x`). Both packages accept it [S1, S2]. hono.dev says to use the newest release of each major [S17].
- TypeScript: `hono` 4.13.12 builds with `typescript ^6.0.3` and `@typescript/native-preview` 7.0.0-dev (the TS 7 compiler) [S1, `devDependencies`]. The 4.13.12 release bundles its `.d.ts` files and type-checks them from a consumer project (release notes). The repo's TS 7.0.2 is not checked against them here; see Gotchas.
- pnpm: both versions are older than one day, so `minimumReleaseAge` needs no exclude. With `catalogMode: strict`, add them to the catalog first.

## Install command

```yaml
# pnpm-workspace.yaml, catalog
"@hono/node-server": 2.1.3
hono: 4.13.12
```

```sh
pnpm --filter @repo/server add hono@catalog: @hono/node-server@catalog:
```

`ws`, `@types/ws`, `zod` and `@trpc/server` are already there. Add nothing else: no `@hono/node-ws`, no validator package.

## Generator command

None applies. `npm create hono@latest` scaffolds a new project [S17]; it does not add Hono to an existing package. Both worker files are written by hand.

## 1. Versions in short

`hono` 4.13.12 and `@hono/node-server` 2.1.3. Both are ESM, both run on Node 24, and neither has dependencies.

## 2. Hono on Node with `ws` and `applyWSSHandler` on the same port

### What the adapter gives you

- `getRequestListener(fetch, { hostname?, errorHandler?, overrideGlobalObjects?, autoCleanupIncoming? })` turns `app.fetch` into a `(incoming, outgoing) => Promise<void>` listener for `node:http` [S6]. hono.dev documents it on its Next.js page [S19].
- `createAdaptorServer(options)` is `createServer(serverOptions, getRequestListener(...))` from `node:http`. It adds an `upgrade` handler **only** when `options.websocket.server` is set [S5]. It does not listen. Its return type is `ServerType = Server | Http2Server | Http2SecureServer` [S6 `types.ts`].
- `serve(options, onListening?)` calls `createAdaptorServer`, then `server.listen(options.port ?? 3000, options.hostname, ...)` straight away. The callback runs only on success. There is no promise and no error path [S5]. A listen error is emitted as `'error'` on the returned server.

### Option A: a plain `http.Server`, then `new WebSocketServer({ server, verifyClient })`

This is the shape the repo has today and the shape of tRPC's own standalone example [S22]. The Hono listener handles `request` events. `ws` adds its own `upgrade` listener, and Hono never sees upgrades, because the adapter registers none without the `websocket` option [S5]. `applyWSSHandler` gets the real `ws` `WebSocketServer` that its types require (`wss: ws.WebSocketServer`) [S21].

There are two ways to build the server:

- `createServer(getRequestListener(app.fetch, { overrideGlobalObjects: false }))` from `node:http`. It returns `http.Server`, so it passes straight to `new WebSocketServer({ server })`, whose type is `HTTPServer | HTTPSServer` (`@types/ws`). It also exposes `errorHandler` (see point 4).
- `createAdaptorServer({ fetch: app.fetch, overrideGlobalObjects: false })`. It does the same thing, but you must cast the `ServerType` union to `http.Server` before you give it to `ws`.

### Option B: node-server's built-in `upgradeWebSocket`, or `@hono/node-ws`

- `@hono/node-ws` is deprecated. node-server v2 has built-in WebSocket support, and the package's peer pins node-server `^1.19.11` [S3, S10, S17]. Do not use it.
- The built-in helper needs `new WebSocketServer({ noServer: true })`, passed as `serve({ fetch, websocket: { server: wss } })`. It throws if `noServer` is not `true` [S5]. On `upgrade`, the adapter builds a `Request`, runs it through `app.fetch` (so Hono middleware sees the upgrade), and, if a route answered with `upgradeWebSocket(...)`, calls `wss.handleUpgrade` and then `wss.emit('connection', ws, request)` [S7].
- tRPC's `applyWSSHandler` listens on `wss.on('connection', ...)` [S21]. So by the source, tRPC *would* get these sockets if both shared the same `wss` and a Hono route at `/` called `upgradeWebSocket(() => ({}))`. This is not documented by either project and was not run here. It also stacks two listeners on each socket, because Hono's helper adds its own `message` and `close` handlers. The helper had an unauthenticated memory-leak advisory fixed in 2.0.10 [S9]. tRPC cannot use Hono's `WSContext` directly, because it needs the `ws` server and its `'connection'` event, not Hono's event callbacks.

### Recommendation

**Option A**, with `createServer(getRequestListener(app.fetch, { overrideGlobalObjects: false }))`. Hono serves only HTTP. `ws` owns upgrades exactly as it does today. tRPC's documented wiring does not change. The server stays a typed `node:http` `Server`, so spec section 5 ("One `node:http` server") stays true, and no cast is needed. `createAdaptorServer` plus `as Server` is an acceptable alternative. Use `serve()` nowhere: it listens before you can wire errors and it has no promise.

## 3. Bind to 127.0.0.1, a `listen` that resolves once bound, EADDRINUSE, and a clean close

- Keep a hand-written `listen` (as `start.ts` has today): `server.once('error', reject)`, then `server.listen(port, '127.0.0.1', resolve)`, then `off('error', reject)`. Checked: a second `listen` on a used port rejects with `EADDRINUSE` [S26]. `startWorker` should then close what it opened (the `WebSocketServer` and the database) and rethrow. `main.ts` already logs, then `process.exit(1)`, and the supervisor counts the crash.
- Do not pass `hostname` to `getRequestListener`. It is only the fallback Host for building the URL, not a bind address [S6]. Node already answers 400 to an HTTP/1.1 request without `Host` (`requireHostHeader`, default `true`) [S25].
- Close order: `broadcastReconnectNotification()`, then `terminate()` every `webSocketServer.clients`, then `webSocketServer.close()`, then `server.close()`, then the database.
  - `ws`'s `close()` does not close existing connections or an external HTTP server [S23].
  - Since Node 19, `server.close()` closes idle keep-alive connections [S25], but it **waits for upgraded sockets**. Checked: with one live `ws` client, `server.close`'s callback had not fired after 1 s; after `terminate()` it fired at once [S26].
  - Return a promise from `close()` that resolves on `server.close`'s callback, so `main.ts` and a later XState actor can await it.
- Known nit, not new: `terminate()` straight after `broadcastReconnectNotification()` destroys the socket, so the reconnect message may not be flushed. If that matters, use `client.close(1012)` with a short timeout, then `terminate()`.

## 4. The request guard

- **Where the checks run.** For HTTP, the Host check is the first Hono middleware (`app.use`). For upgrades, Host and Origin stay in `verifyClient`, because with Option A, Hono never sees an upgrade. `ws` calls `verifyClient` inside `handleUpgrade`, and `callback(false, 403, 'Forbidden')` writes the 403 [S23]. The `ws` docs discourage `verifyClient` in favour of your own `server.on('upgrade')` with `noServer: true` [S23]. For a synchronous header check, `verifyClient` is enough and the current tests cover it. Switching would be a separate, optional change.
- **Built-in middleware does not fit.**
  - `csrf` acts only on unsafe methods (not GET, HEAD, or OPTIONS) with form content types [S14].
  - `cors` only sets response headers.
  - `ip-restriction` filters by remote address, which binding to `127.0.0.1` already covers.
  - The 4.13.12 middleware folder has no Host check [S14].
  - Hono has no Host helper beyond `c.req.header('host')`.
- **One guard, one log line, one counter.** Make the guard take header values instead of an `IncomingMessage`, so it works for a Hono `Request`, for `app.request()` in tests, and for `verifyClient`'s `req`:

  ```ts
  // request-guard.ts: same schemas, log line, and counter as today
  allowsRequest: (headers: { host: string | undefined }) => boolean
  allowsUpgrade: (headers: { host: string | undefined; origin: string | undefined }) => boolean
  ```

  `start.ts` builds the guard once and passes it to both `createHttpApp` and `verifyClient`, so both paths share one counter.
- **Behaviour change to accept or handle.** The adapter builds the request URL from `Host` *before* any middleware runs. If `Host` does not parse as a URL authority, it throws `RequestError('Invalid host header')`, and without an `errorHandler` it answers **400**, not logged or counted [S6 `url.ts`, `listener.ts`]. A well-formed foreign Host such as `evil.example:7337` still reaches the guard and gets 403. Spec section 5 says "Anything else gets 403", and AGENTS.md says to "report and count unrecognised shapes". To keep both, pass `errorHandler` to `getRequestListener`: it receives the `RequestError` for these cases, so it can log through the guard's reporter, count, and return `new Response(null, { status: 403 })` [S6]. Otherwise record that Node and the adapter answer 400 to malformed requests before the guard runs.
- **Repeated Host headers.** `c.req.header('host')` reads `host` from `rawHeaders` and joins repeats with `, ` [S6 `headers.ts`]. The guard's `z.enum` then rejects the request, which is stricter than `incoming.headers.host`, where Node keeps only the first value.

## 5. Streaming a blob

| Approach | Status before body | Content-Length | Notes |
|---|---|---|---|
| `stream(c, cb)` from `hono/streaming` | No: returns `c.newResponse(readable)` at once and runs `cb` afterwards [S13] | No | Adds a `TransformStream` copy. You must open the file *before* calling it to get 404, so it adds nothing. |
| `serveStatic` from `@hono/node-server/serve-static` | Yes (`statSync`) | Yes | Built for URL-path to file mapping: it decodes the path, rejects `%` since 2.1.3 (security fix), sets MIME from the extension, handles Range and HEAD [S8, S9]. It uses a blocking `statSync`, and `root` or `path` must be bent to fit an id route. It also has a race between `statSync` and `createReadStream`. |
| `c.body(Readable.toWeb(handle.createReadStream()), 200, headers)` after `await open(...)` | Yes | Yes, from `handle.stat()` | Same stream path that `serveStatic` uses on Node ≥ 22.7 [S8 `utils/stream.ts`]. |

**Recommendation: the third.** Validate the id with Zod, `await open(path)`, map `ENOENT` to 404, `stat` the handle for `Content-Length` (and 404 if it is not a file), then return the web stream with `content-type: application/octet-stream`. The adapter writes it with backpressure (`drain`) and cancels the reader when the client goes away, which destroys the file stream and closes the handle (`autoClose`) [S6 `utils.ts`]. A read error after headers destroys the response [S6]. That matches today's `response.destroy(error)`.

**No path traversal.** Keep `BlobId = z.string().regex(/^[0-9a-f]{64}$/)` as the only gate before `join`. `c.req.param('id')` is percent-decoded with `decodeURIComponent` [S16], so `%2F` or `%2e%2e` turn into real characters. The hex regex rejects them all. `/blobs/:id` matches one path segment only. A route regex like `/blobs/:id{[0-9a-f]{64}}` would also work, but it duplicates the schema. Keep Zod as the one check, per AGENTS.md.

**405.** Hono has no automatic 405. It dispatches HEAD to GET routes and answers unknown routes with `404 Not Found` text [S11]. `hono/method-not-allowed` (new in 4.13.0) answers 405 only when the path matches a route, and it allows HEAD [S15]. Today, every non-GET gets 405, including HEAD and unknown paths. To keep that behaviour, add one line to the guard middleware: `if (c.req.method !== 'GET') return c.json({ error: 'Method not allowed' }, 405, { Allow: 'GET' })`. A HEAD request reaches middleware with `c.req.method === 'HEAD'`, because only the route lookup uses GET [S11]. Add `app.notFound(c => c.json({ error: 'Not found' }, 404))` so 404 bodies stay JSON.

## 6. Zod validation in Hono

`@hono/zod-validator` 0.9.1 accepts Zod 4. On failure, both it and `@hono/standard-validator` answer **400** with the issues, unless you pass a hook [S20]. The blob route needs 404, so either one needs a hook, plus a package. For one path param, `BlobId.safeParse(c.req.param('id'))` inside the handler is shorter and adds nothing. Hono's own `validator('param', fn)` from `hono/validator` is the zero-dependency typed option, if more routes ever come. **Recommendation: add neither package.**

## 7. Testing with Vitest

- **Routes without a socket:** `createHttpApp(options).request('/health', { headers: { host: '127.0.0.1:7337' } })` returns a `Response` [S18]. `app.request` builds `new Request('http://localhost' + path, init)` [S11], and Node 24's `Request` keeps a `host` header set in `init` [S26]. So pass `host` on every call, or the guard answers 403. Pass a real guard built with port 7337. Cover these cases:
  - `/health` returns 200 JSON;
  - a written blob returns 200 with its bytes, `content-type` and `content-length`;
  - a missing 64-hex id returns 404;
  - malformed ids return 404 (`abc`, an uppercase hex id, `..%2F..%2Fargo.db`);
  - `POST /health` and `HEAD /health` return 405 with `Allow: GET`;
  - an unknown path returns 404;
  - a foreign Host returns 403.
- **Real socket:** keep `start.test.ts` for the guard over a real `listen`: the upgrade Origin cases, Host on HTTP and on `ws`, and the 403 status. Change `afterEach` to `await closeWorker()`. Add two cases:
  - starting a second worker on a used port rejects with `EADDRINUSE`;
  - `close()` resolves while a `ws` client is connected (the test that `terminate()` comes before `server.close()`).
- Keep `overrideGlobalObjects: false`. With the default `true`, the first `getRequestListener` call replaces the global `Request` and `Response` for the whole Vitest worker [S4, S6].

## 8. Gotchas

1. **Globals.** `getRequestListener` and `createAdaptorServer` default to `overrideGlobalObjects: true`, which redefines `global.Request` and `global.Response` as lightweight classes, process-wide [S4, S6]. The worker also runs tRPC and future Agent code, and speed does not matter on loopback. Pass `false`.
2. **Bad Host means 400 before middleware.** See point 4. Missing Host on HTTP/1.1 is a 400 from Node itself [S25].
3. **Default content type.** A response body without `content-type` goes out as `text/plain; charset=UTF-8` [S6 `response.ts`]. Set `application/octet-stream` on blobs. `c.json` sets `application/json` [S12].
4. **`serve()` listens at once** on port 3000 by default and has no error path [S5]. Do not use it in the worker.
5. **`ServerType` is a union** that includes HTTP/2 servers [S6]. `createAdaptorServer`'s result needs a cast before `new WebSocketServer({ server })`. `node:http`'s `createServer(getRequestListener(...))` does not.
6. **Types without the DOM lib.** `tooling/typescript/base.json` sets `lib: ["es2025"]` and `types: ["node"]`. Hono's public types use `Request`, `Response`, `Headers`, `ReadableStream`, `Blob`, `File` and `FormData` [S12]. `@types/node` 24.19.1 declares all of these as globals, plus `MessageEvent` and `CloseEvent`, but not `ErrorEvent`, `BodyInit` or `HeadersInit` [S24]. With `skipLibCheck: true` (set in the repo), gaps inside library `.d.ts` files are not reported. Check `Readable.toWeb(...)` (typed `stream/web` `ReadableStream`) against `c.body`'s `Data` with `pnpm --filter @repo/server check-types` when you implement. Without DOM, the global `ReadableStream` *is* `stream/web`'s [S24], so it should match, but this was not compiled.
7. **ESM and tsx.** Both packages are `"type": "module"` with `import` and `types` export conditions [S1, S2]. That suits `moduleResolution: "bundler"` and `tsx`. Subpaths used: `hono`, and `@hono/node-server` (root only).
8. **Headers from `IncomingMessage`.** The adapter reads most headers from Node's parsed `headers`, but reads `host`, `content-type`, `authorization` and the rest of RFC 9110's single-value set from `rawHeaders`, joining repeats [S6 `headers.ts`]. `c.env.incoming` and `c.env.outgoing` give the raw Node objects (`HttpBindings`) [S4], but `app.request()` in tests has no `env`. Do not rely on them.
9. **`autoCleanupIncoming`** (default `true`) drains or destroys unread request bodies on non-GET requests [S4, S6]. Keep the default: with the 405 middleware no body is read.
10. **`ws` `close()` and `server.close()`** do not end upgraded sockets. Terminate the clients first [S23, S25, S26].

## 9. Plan

### Files

| File | Change |
|---|---|
| `apps/server/src/worker/http-app.ts` | New. `createHttpApp(options): Hono` with the guard and method middleware, `/health`, `/blobs/:id`, `notFound`, and `onError` (log, JSON 500). No socket, no `listen`. |
| `apps/server/src/worker/http-routes.ts` | Delete. |
| `apps/server/src/worker/request-guard.ts` | Take header values instead of `IncomingMessage`; export `type RequestGuard`. Same schemas, log line and counter. |
| `apps/server/src/worker/start.ts` | Wire `node:http` + `getRequestListener(app.fetch)`, `ws`, tRPC; `listen` and `close` return promises. |
| `apps/server/src/worker/main.ts` | `await worker.close()` before `process.exit(0)`. |
| `apps/server/src/worker/http-app.test.ts` | New, with `app.request` (point 7). |
| `apps/server/src/worker/start.test.ts` | `await closeWorker()`; add the EADDRINUSE and close-with-client cases. |
| `apps/server/package.json`, `pnpm-workspace.yaml` | Add `hono` and `@hono/node-server` to the catalog and to `dependencies`. |

### `http-app.ts` (sketch, not compiled)

```ts
import { open } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { Hono } from 'hono';
import { z } from 'zod';
import type { RequestGuard } from './request-guard';

export interface HttpAppOptions {
  guard: RequestGuard;
  blobsFolder: string;
  version: string;
  startedAt: string;
}

// A blob id is the sha256 of its content, so it cannot name a path outside the blobs folder.
const BlobId = z.string().regex(/^[0-9a-f]{64}$/);

const openBlob = (path: string) =>
  open(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  });

// Plain HTTP serves only /health and /blobs/:id (ADR 0002); tRPC runs over the WebSocket.
export function createHttpApp(options: HttpAppOptions) {
  const app = new Hono();
  app.use(async (c, next) => {
    if (!options.guard.allowsRequest({ host: c.req.header('host') }))
      return c.json({ error: 'Forbidden' }, 403);
    if (c.req.method !== 'GET')
      return c.json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });
    await next();
  });
  app.get('/health', (c) =>
    c.json({ ok: true, version: options.version, startedAt: options.startedAt }),
  );
  app.get('/blobs/:id', async (c) => {
    const blobId = BlobId.safeParse(c.req.param('id'));
    if (!blobId.success) return c.json({ error: 'Not found' }, 404);
    const file = await openBlob(join(options.blobsFolder, blobId.data));
    if (!file) return c.json({ error: 'Not found' }, 404);
    const stats = await file.stat();
    if (!stats.isFile()) {
      await file.close();
      return c.json({ error: 'Not found' }, 404);
    }
    return c.body(Readable.toWeb(file.createReadStream()), 200, {
      'content-type': 'application/octet-stream',
      'content-length': String(stats.size),
    });
  });
  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((error, c) => {
    console.error(`worker: ${String(error)}`);
    return c.json({ error: 'Internal error' }, 500);
  });
  return app;
}
```

### `start.ts` wiring (sketch, not compiled)

```ts
import { createServer, type Server } from 'node:http';
import { getRequestListener } from '@hono/node-server';
// ...existing imports

const listen = (server: Server, port: number) =>
  new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

export async function startWorker(options: WorkerOptions) {
  // ...startedAt, database, services as today
  const guard = createRequestGuard(options.port);
  const app = createHttpApp({ guard, blobsFolder: join(options.home, 'blobs'), version: options.version, startedAt });
  const server = createServer(getRequestListener(app.fetch, { overrideGlobalObjects: false }));
  const webSocketServer = new WebSocketServer({
    server,
    verifyClient: ({ req }, callback) =>
      callback(guard.allowsUpgrade({ host: req.headers.host, origin: req.headers.origin }), 403, 'Forbidden'),
  });
  const handler = applyWSSHandler({ wss: webSocketServer, router: appRouter, createContext: () => ({ services }), keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5000 } });

  try {
    await listen(server, options.port);
  } catch (error) {
    webSocketServer.close();
    database.$client.close();
    throw error;
  }

  const close = async () => {
    handler.broadcastReconnectNotification();
    for (const client of webSocketServer.clients) client.terminate();
    webSocketServer.close();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    database.$client.close();
  };

  return { startedAt, close };
}
```

### Ready for an XState worker machine

`startWorker(options): Promise<{ startedAt, close(): Promise<void> }>` is a plain function, and both halves are promises:

- **Start.** `fromPromise(({ input }) => startWorker(input))` gives `onDone` once the port is bound and `onError` with `EADDRINUSE`.
- **Stop.** Run a `stopping` state that invokes `fromPromise(({ input }) => input.worker.close())`. Do not put the close in a `fromCallback` cleanup. XState does not await cleanup functions (`docs/research/xstate.md`, callback actors), so an async close there would race `process.exit`.
- **No timers or signals inside.** The heartbeat interval and the signal handlers stay in `main.ts`, or move into the machine later.

### Tests that change

- `start.test.ts`: `afterEach(async () => { await closeWorker(); ... })`. New cases: a second `startWorker` on the same port rejects with `code: 'EADDRINUSE'`; `close()` resolves with an open `ws` client. The existing Host and Origin cases stay as they are.
- `http-app.test.ts`: new (point 7).
- Optional `request-guard.test.ts`: the counter and log line for Host and for Origin.

### One-line doc edits the change needs

- **ADR 0002**, second paragraph: "The Server serves plain HTTP only for `GET /health` and `GET /blobs/:id`" becomes "The Server serves plain HTTP only for `GET /health` and `GET /blobs/:id`, with Hono (`@hono/node-server`'s `getRequestListener`) on the same `node:http` server."
- **Spec section 5, Worker**, first bullet: "One `node:http` server on `127.0.0.1`, …" becomes "One `node:http` server on `127.0.0.1` whose requests a Hono app handles through `@hono/node-server`, …" The rest is unchanged.
- Optional, spec section 5, Host bullet: add "A request whose Host is not a valid authority gets 400 from the adapter." Do this only if the `errorHandler` route from point 4 is not taken.
- `docs/research/trpc.md`'s "HTTP and WebSocket on one port" snippet shows `http.createServer(handleHttp)`. It stays correct in shape (Option A). Only the handler is now `getRequestListener(app.fetch)`.

## Against ADRs and the spec

- **No ADR is contradicted.** ADR 0002 keeps one WebSocket for every tRPC call and plain HTTP for two routes only. Hono changes only who writes those two routes. `@hono/trpc-server` (tRPC over HTTP) *would* contradict ADR 0002's rejected option "HTTP for queries and WebSocket only for subscriptions". Do not add it.
- **Spec section 5, "Anything else gets 403".** Malformed Host values now get 400 from the adapter before the guard runs, and they are not logged or counted (point 4). Either add the `errorHandler`, or edit the spec line.
- **Spec section 5, 405.** The spec does not mention 405. Today's code returns it for every non-GET, and the plan keeps that, plus `Allow: GET`. With Hono's defaults, HEAD would answer 200 and unknown non-GET paths 404. That is a behaviour change, so the plan avoids it.
- **AGENTS.md, "Reject, report, and count unrecognised shapes".** A malformed blob id is rejected with 404 but is not logged or counted, and that is true today too. If the rule should cover it, route the 404 through the same reporter as the guard.
