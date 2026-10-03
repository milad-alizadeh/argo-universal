# tRPC 11 with TanStack Query and WebSocket

Checked on 2026-10-03 against tRPC 11.19.0. Source facts come from the published package source (the npm tarballs ship `src/`) and the matching `v11.19.0` tag on GitHub. Each claim marked "verified" was also compiled with `tsc --strict` (TypeScript 7.0.2) and run under Node 24.21.0 in a throwaway project.

## Sources

| # | Title | URL | Used for |
|---|---|---|---|
| S1 | npm registry (`npm view`) | https://www.npmjs.com/package/@trpc/server | Versions, publish dates, peer dependencies |
| S2 | tRPC Quickstart | https://trpc.io/docs/quickstart | Install, TypeScript >=5.7.2, `strict`, file layout, no generator |
| S3 | tRPC Subscriptions | https://trpc.io/docs/server/subscriptions | Async generator, `signal`, `tracked()`, `zAsyncIterable`, cleanup |
| S4 | tRPC WebSockets | https://trpc.io/docs/server/websockets | `applyWSSHandler`, `keepAlive`, `broadcastReconnectNotification`, wire messages |
| S5 | tRPC wsLink | https://trpc.io/docs/client/links/wsLink | `createWSClient` options table |
| S6 | tRPC Links overview | https://trpc.io/docs/client/links | Custom link shape, terminating link rule |
| S7 | tRPC TanStack React Query setup | https://trpc.io/docs/client/tanstack-react-query/setup | Install, `createTRPCContext`, providers |
| S8 | tRPC TanStack React Query usage | https://trpc.io/docs/client/tanstack-react-query/usage | `queryOptions`, `subscriptionOptions`, `useSubscription` result |
| S9 | tRPC Server-side calls | https://trpc.io/docs/server/server-side-calls | `createCallerFactory`, warning about inner calls |
| S10 | tRPC Validators | https://trpc.io/docs/server/validators | Standard Schema, Zod as default, `.output()` |
| S11 | tRPC Standalone adapter | https://trpc.io/docs/server/adapters/standalone | `createHTTPHandler`, custom routes beside tRPC |
| S12 | tRPC vanilla client setup | https://trpc.io/docs/client/vanilla/setup | `import type { AppRouter }` |
| S13 | `examples/standalone-server/src/server.ts` | https://github.com/trpc/trpc/blob/main/examples/standalone-server/src/server.ts | HTTP and `ws` on one port via `new WebSocketServer({ server })` |
| S14 | `localLink.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/links/localLink.ts | Reference terminating link: envelopes it emits |
| S15 | `links/types.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/links/types.ts | `Operation`, `OperationResultEnvelope`, `TRPCLink` |
| S16 | `rpc/envelopes.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/server/src/unstable-core-do-not-import/rpc/envelopes.ts | `TRPCResult`, `TRPCResultMessage` (`started`/`stopped`/`data`) |
| S17 | `links/internals/subscriptions.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/links/internals/subscriptions.ts | `TRPCConnectionState` (`type: 'state'`) |
| S18 | `TRPCUntypedClient.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/internals/TRPCUntypedClient.ts | How the client dispatches envelopes to `onStarted`/`onData`/... |
| S19 | `adapters/ws.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/server/src/adapters/ws.ts | Server options, `createContext` args, keep-alive, messages sent |
| S20 | `wsClient.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/links/wsLink/wsClient/wsClient.ts | Reconnect, resend, `lastEventId`, query vs subscription on close |
| S21 | `wsClient/options.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/client/src/links/wsLink/wsClient/options.ts | Option defaults, `exponentialBackoff` |
| S22 | `subscriptionOptions.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/tanstack-react-query/src/internals/subscriptionOptions.ts | `useSubscription` status machine |
| S23 | `middleware.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/server/src/unstable-core-do-not-import/middleware.ts | `.output()` parses the whole return value |
| S24 | `clientish/inference.ts` (v11.19.0) | https://github.com/trpc/trpc/blob/v11.19.0/packages/server/src/unstable-core-do-not-import/clientish/inference.ts | `inferRouterInputs/Outputs` |
| S25 | `subscriptions` agent skill shipped in `@trpc/server@11.19.0` | https://github.com/trpc/trpc/tree/v11.19.0/packages/server/skills/subscriptions | Maintainers' "common mistakes" list |
| S26 | ws README | https://github.com/websockets/ws/blob/master/README.md | `{ server }` option, optional native add-ons |
| S27 | Node.js globals: `WebSocket` | https://nodejs.org/api/globals.html | Global `WebSocket` stable since Node 22.4 |
| S28 | React Native Networking | https://reactnative.dev/docs/network | Built-in `WebSocket`, cleartext rules |
| S29 | TanStack Query: React Native | https://tanstack.com/query/latest/docs/framework/react/react-native | `focusManager`, `onlineManager` |

## Versions

Checked 2026-10-03 with `npm view` [S1].

| Package | Latest stable | Published | Notes |
|---|---|---|---|
| `@trpc/server` | 11.19.0 | 2026-09-16 | peer: `typescript >=5.7.2` |
| `@trpc/client` | 11.19.0 | 2026-09-16 | peer: `@trpc/server` **exactly** `11.19.0` |
| `@trpc/tanstack-react-query` | 11.19.0 | 2026-09-16 | peers: `@trpc/client` and `@trpc/server` exactly `11.19.0`, `@tanstack/react-query ^5.80.3`, `react >=18.2.0` |
| `@tanstack/react-query` | 5.104.1 | 2026-10-02 | peer: `react ^18 \|\| ^19` |
| `ws` | 8.22.0 | 2026-09-26 | optional peers `bufferutil`, `utf-8-validate` (`peerDependenciesMeta.optional: true`) |
| `@types/ws` | 8.18.2 | 2026-09-29 | `ws` ships no types |
| `zod` | 4.6.5 | 2026-09-13 | |

All three `@trpc/*` packages are ESM-first with CJS fallbacks (`exports.import` / `exports.require`) [S1, package.json of each].

## Install command

From the tRPC docs [S2, S4, S7], split by workspace package to match spec section 4:

```sh
pnpm --filter @repo/api add @trpc/server zod
pnpm --filter @repo/server add @trpc/server ws
pnpm --filter @repo/server add -D @types/ws
pnpm --filter @repo/client add @trpc/client @trpc/server @trpc/tanstack-react-query @tanstack/react-query
pnpm --filter @repo/client add -D @repo/api@workspace:*
```

In the repo these versions go into the pnpm catalog and packages use `catalog:` (spec section 2).

## Generator command

None. tRPC has no official project generator: the Quickstart installs packages by hand and names no CLI [S2]. On npm, `create-trpc-app` is an empty 1.0.0 package last changed in 2022, and `@trpc/upgrade` is a codemod for moving from v10 to v11, not a scaffold [S1]. `create-t3-app` is a third-party stack generator, not tRPC's. So every tRPC file in the scaffold is written by hand, which spec section 0 allows ("Write a file by hand only when no generator makes it").

## Recommended configuration

Names in these snippets follow the repo rules (full words, one-line comments).

### Server: init and procedures (`packages/api`)

Separate init, routers, and the server entry to avoid import cycles [S2]. `initTRPC` with no transformer means plain JSON on the wire [S2].

```ts
// packages/api/src/trpc.ts
import { initTRPC } from '@trpc/server';
import type { Services } from './services';

export type Context = { services: Services };
const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
```

```ts
// packages/api/src/system/info.ts: .output() with a Zod 4 object works for queries and mutations
export const info = publicProcedure.output(SystemInfo).query(({ ctx }) => ctx.services.system.info());
```

Subscriptions are `async function*` resolvers. The resolver gets `signal`, which aborts when the client stops the subscription or disconnects; tRPC calls `.return()` on the generator, so `try/finally` cleanup runs [S3]. On the WebSocket adapter the signal is a per-subscription `AbortController` aborted on `subscription.stop` or socket close [S19].

```ts
// packages/api/src/system/clock.ts
export const clock = publicProcedure.subscription(async function* ({ ctx, signal }) {
  yield* ctx.services.system.clock(signal);
});
```

`signal` is typed `AbortSignal | undefined` (`ProcedureResolverOptions.signal`, `procedureBuilder.ts` line 109 in 11.19.0), and a `createCaller` call without a `signal` option passes `undefined` [S9 source: `router.ts`]. Verified: spec section 4's `clock(signal: AbortSignal)` fails `tsc --strict` with "Argument of type 'AbortSignal | undefined' is not assignable". Either type the service as `clock(signal: AbortSignal | undefined)` or narrow in the procedure. See Gotchas.

**Output validation of subscriptions.** `.output(schema)` runs the schema once on the whole return value [S23]. For a generator that value is an async iterable, so `.output(ClockTick)` on a subscription fails type checking ("No overload matches this call") and, if forced, fails at runtime with `Output validation failed` (verified). The docs give a `zAsyncIterable` helper that wraps the schema per yielded item [S3]. A trimmed version that compiles with Zod 4.6.5 (verified):

```ts
const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  value != null && typeof value === 'object' && Symbol.asyncIterator in value;

export function zAsyncIterable<TYieldIn, TYieldOut>(options: { yield: z.ZodType<TYieldOut, TYieldIn> }) {
  return z
    .custom<AsyncIterable<TYieldIn>>((value) => isAsyncIterable(value))
    .transform(async function* (iterable) {
      for await (const value of iterable) yield options.yield.parseAsync(value);
    }) as unknown as z.ZodType<AsyncIterable<TYieldOut, void, unknown>, AsyncIterable<TYieldIn, void, unknown>>;
}

export const clock = publicProcedure
  .output(zAsyncIterable({ yield: ClockTick }))
  .subscription(async function* ({ ctx, signal }) {
    yield* ctx.services.system.clock(signal);
  });
```

The docs version also handles `tracked` envelopes and a `return` schema [S3]. Because `contracts` may import only `zod` (spec section 4), this helper belongs in `packages/api`, not `contracts`.

**`tracked(id, data)`.** Yield `tracked(id, value)` and the client stores the id as `lastEventId`; on reconnect `wsLink` re-sends the subscription with `lastEventId` merged into the input [S3, S20]. The procedure's input must accept it, for example `z.object({ lastEventId: z.string().nullish() }).optional()` [S25]. The client then receives `{ id, data }`, not the bare value (verified: `{"id":"1","data":{"i":1}}`). `tracked('')` throws [S25]. The clock does not need `tracked`; `feed.subscribe` may.

### Server: HTTP and WebSocket on one port (`apps/server/src/worker`)

The official example attaches `ws` to the HTTP server with `new WebSocketServer({ server })` [S13, S26]. Plain routes like `/health` stay in the `http` request handler [S11]. Verified on Node 24: `/health` over HTTP and tRPC over `ws://` on the same port.

```ts
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from '@repo/api';

const server = http.createServer(handleHttp); // /health and /blobs/:id
const webSocketServer = new WebSocketServer({ server });
const handler = applyWSSHandler({
  wss: webSocketServer,
  router: appRouter,
  createContext: () => ({ services }),
  keepAlive: { enabled: true, pingMs: 30_000, pongWaitMs: 5_000 },
});
server.listen(port, '127.0.0.1');

process.on('SIGTERM', () => {
  handler.broadcastReconnectNotification();
  webSocketServer.close();
  server.close();
});
```

`applyWSSHandler` options in 11.19.0 [S19]:

| Option | Meaning | Default |
|---|---|---|
| `wss` | the `ws.WebSocketServer` | required |
| `router` | the app router | required |
| `createContext(opts)` | `opts` is `{ req: IncomingMessage, res: ws.WebSocket, info: TRPCRequestInfo }`; type `CreateWSSContextFnOptions`. Called once per connection. `info.connectionParams` holds what the client sent in `connectionParams` | optional |
| `prefix` | ignore connections whose `req.url` does not start with it | none |
| `keepAlive.enabled` / `pingMs` / `pongWaitMs` | server sends text `PING`, terminates if no message within `pongWaitMs` | `false` / 30 000 / 5 000 |
| `dangerouslyDisablePong` | stop answering client `PING` | `false` (tests only) |
| `onError` | error hook | none |
| `experimental_encoder` | custom wire encoding | `jsonEncoder` |

`applyWSSHandler` returns `{ broadcastReconnectNotification }`, which sends `{ id: null, method: 'reconnect' }` to every open client [S19]. The client treats it as a close and reconnects with backoff, re-sending pending subscriptions [S20]. The docs pair it with `SIGTERM` [S4]. In this repo the worker is restarted by the supervisor, so call it in the worker's shutdown path.

### Client: WebSocket client and providers (`packages/client/src/trpc`)

```ts
// packages/client/src/trpc/context.ts
import { createTRPCContext } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@repo/api';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
```

```ts
// packages/client/src/trpc/create-trpc-client.ts
import type { AppRouter } from '@repo/api';
import * as trpc from '@trpc/client';

// Every tRPC call goes over one WebSocket to the Server (ADR 0002).
export function createTRPCClient(url: string) {
  const webSocketClient = trpc.createWSClient({
    url,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
  const client = trpc.createTRPCClient<AppRouter>({
    links: [trpc.wsLink<AppRouter>({ client: webSocketClient })],
  });
  return { client, close: () => webSocketClient.close() };
}

export type TRPCClient = ReturnType<typeof createTRPCClient>['client'];
```

```tsx
// packages/client/src/trpc/AppProviders.tsx
export function AppProviders({ serverUrl, children }: { serverUrl: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [{ client }] = useState(() => createTRPCClient(serverUrl));
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={client} queryClient={queryClient}>{children}</TRPCProvider>
    </QueryClientProvider>
  );
}
```

`TRPCProvider` takes `trpcClient` and `queryClient` but does not render a `QueryClientProvider`, so both are needed [S7, Context.tsx in S22's package]. `useTRPC()` throws outside `<TRPCProvider>` [same source].

`createWSClient` options (11.19.0) [S5, S21]:

| Option | Meaning | Default |
|---|---|---|
| `url` | string, or a function returning a string or a promise of one | required |
| `connectionParams` | object or (async) function; sent as the first message; read on the server in `createContext` as `info.connectionParams` | none |
| `WebSocket` | ponyfill for the `WebSocket` class | `globalThis.WebSocket`; throws "No WebSocket implementation found" if absent |
| `retryDelayMs(attemptIndex)` | reconnect delay | `exponentialBackoff`: 0 ms on attempt 0, then `min(1000 * 2^n, 30 000)` |
| `onOpen()`, `onError(event?)`, `onClose(cause?: { code? })` | lifecycle callbacks | none |
| `lazy: { enabled, closeMs }` | open on first request, close after `closeMs` idle | `{ enabled: false, closeMs: 0 }` |
| `keepAlive: { enabled, intervalMs, pongTimeoutMs }` | client sends text `PING`, closes if no `PONG` in time | `{ enabled: false, intervalMs: 5_000, pongTimeoutMs: 1_000 }` |
| `experimental_encoder` | custom wire encoding | `jsonEncoder` |

The client returned by `createWSClient` also has `close()` and a `connectionState` observable [S20].

### Client: queries and subscriptions in screens

```tsx
const trpc = useTRPC();
const info = useQuery(trpc.system.info.queryOptions());
const clock = useSubscription(trpc.system.clock.subscriptionOptions());
// clock.status: 'idle' | 'connecting' | 'pending' | 'error'; clock.data, clock.error, clock.reset()
```

`useSubscription` is imported from `@trpc/tanstack-react-query`, not from `@tanstack/react-query` [S8, S22]. `queryOptions()` produces the key `[["system","info"],{"type":"query"}]` (verified). `subscriptionOptions(input, { enabled, onStarted, onData, onError, onConnectionStateChange })` returns `{ enabled, subscribe, queryKey, trpc }`; passing `skipToken` as input disables it [S22]. `inferInput` and `inferOutput` from `@trpc/tanstack-react-query` give types from `typeof trpc.path.to.procedure` [S8].

`useSubscription` status machine [S22]: starts `connecting` (or `idle` when disabled); `started` envelope or any data sets `pending`; a `state: 'connecting'` envelope sets `connecting` with its `error`; `state: 'idle'` sets `idle` and clears `data`; `state: 'pending'` is ignored (it waits for `started`); an error sets `error`. Completion does not change status.

### Custom `TRPCLink` for Storybook (`packages/client/mocks/trpc-mock-link.ts`)

Link shape [S6, S15]: `TRPCLink<TRouter> = (runtime) => ({ op, next }) => Observable<OperationResultEnvelope, TRPCClientError>`. A mock link is terminating: it never calls `next` [S6]. `observable` comes from `@trpc/server/observable` (a public export path of `@trpc/server`) [S1, S6].

`op` fields [S15]: `{ id: number, type: 'query' | 'mutation' | 'subscription', input, path: string /* dotted, e.g. "system.clock" */, context: OperationContext, signal: AbortSignal | null | undefined }`.

Envelope fields the link must emit, `observer.next({ result, context? })` [S15, S16, S17]:

| Event | `result` value | Source |
|---|---|---|
| query or mutation data | `{ type: 'data', data }` (`type` is optional; `localLink` sends `{ data }`) then `observer.complete()` | `TRPCResult` [S16]; `localLink` [S14]; ws server sends `type: 'data'` [S19] |
| subscription started | `{ type: 'started' }` | `TRPCResultMessage` [S16] |
| subscription item | `{ type: 'data', data }`; for `tracked` items also `id`, and `data` is `{ id, data }` | [S16, S19] |
| subscription stopped | `{ type: 'stopped' }` then `observer.complete()` | [S16, S19] |
| connection state | `{ type: 'state', state: 'idle' \| 'connecting' \| 'pending', error: TRPCClientError \| null }` (`error` non-null only with `connecting`) | `TRPCConnectionState` [S17] |
| error | `observer.error(TRPCClientError)` | [S14] |

How the untyped client routes these [S18]: `result.type === 'state'` → `onConnectionStateChange`; `'started'` → `onStarted({ context })`; `'stopped'` → `onStopped()`; `'data'` or `undefined` → `onData(result.data)`; observable error → `onError`; complete → `onComplete`. A query resolves with `envelope.result.data` of the first envelope and wraps any error with `TRPCClientError.from` [S18].

`TRPCClientError.from(cause, { meta?, cause? })` returns `cause` unchanged if it is already a `TRPCClientError`, builds one from a `{ error: shape }` response, and otherwise wraps any `Error` using its message [S14 imports, `TRPCClientError.ts` in v11.19.0].

A working mock link that satisfies spec section 8 (verified: `tsc --strict` passes, wrong path and wrong shape fail via `@ts-expect-error`, query resolves, subscription emits `started` → data × 3 → `stopped` → complete, a missing fixture errors with `No story mock for system.ticks`, and `queryClient.fetchQuery(trpc.system.info.queryOptions())` works through it):

```ts
import { TRPCClientError, type TRPCLink } from '@trpc/client';
import type { AnyTRPCProcedure, TRPCRouterRecord, inferProcedureInput, inferProcedureOutput } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from '@repo/api';

type RouterRecord = AppRouter['_def']['record'];
type ProcedurePath<TRecord, TPrefix extends string = ''> = {
  [K in keyof TRecord & string]: TRecord[K] extends AnyTRPCProcedure
    ? `${TPrefix}${K}`
    : TRecord[K] extends TRPCRouterRecord ? ProcedurePath<TRecord[K], `${TPrefix}${K}.`> : never;
}[keyof TRecord & string];
type ProcedureAt<TRecord, TPath extends string> = TPath extends `${infer Head}.${infer Tail}`
  ? Head extends keyof TRecord ? ProcedureAt<TRecord[Head], Tail> : never
  : TPath extends keyof TRecord ? TRecord[TPath] : never;
// For a subscription, inferProcedureOutput is AsyncIterable<Yield>, so an async generator fits
type Fixture<TProcedure extends AnyTRPCProcedure> = (
  input: inferProcedureInput<TProcedure>,
  signal: AbortSignal,
) => TProcedure['_def']['type'] extends 'subscription'
  ? inferProcedureOutput<TProcedure>
  : inferProcedureOutput<TProcedure> | Promise<inferProcedureOutput<TProcedure>>;
export type Fixtures = { [P in ProcedurePath<RouterRecord>]?: Fixture<ProcedureAt<RouterRecord, P>> };

type AnyFixture = (input: unknown, signal: AbortSignal) => unknown;

export function trpcMockLink(fixtures: Fixtures): TRPCLink<AppRouter> {
  return () => ({ op }) =>
    observable((observer) => {
      const fixture = (fixtures as Record<string, AnyFixture | undefined>)[op.path];
      const controller = new AbortController();
      (async () => {
        if (!fixture) throw new Error(`No story mock for ${op.path}`);
        if (op.type === 'subscription') {
          observer.next({ result: { type: 'started' } });
          for await (const data of fixture(op.input, controller.signal) as AsyncIterable<unknown>) {
            if (controller.signal.aborted) return;
            observer.next({ result: { type: 'data', data } });
          }
          observer.next({ result: { type: 'stopped' } });
          observer.complete();
          return;
        }
        const data = await fixture(op.input, controller.signal);
        observer.next({ result: { type: 'data', data } });
        observer.complete();
      })().catch((cause: unknown) =>
        observer.error(TRPCClientError.from(cause instanceof Error ? cause : new Error(String(cause)))),
      );
      return () => controller.abort();
    });
}
```

```ts
const fixtures: Fixtures = {
  'system.info': () => ({ version: '1.2.3', startedAt: '2026-10-03T00:00:00.000Z', pid: 1 }),
  'system.clock': async function* (_input, signal) {
    while (!signal.aborted) {
      yield { now: new Date().toISOString() };
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  },
};
```

`pending()` can return `new Promise(() => {})` for a query and an async generator that awaits forever for a subscription. `fails(message)` can throw `new Error(message)`; the link turns it into a `TRPCClientError`.

Do not use `unstable_localLink` for Storybook: it runs the real router and needs a server context, and it is still marked `unstable_` (`experimental_localLink` is a deprecated alias) [S14]. It is still the best reference for envelope shapes.

### Type helpers

Public type exports from `@trpc/server` [S1, `src/@trpc/server/index.ts`]: `inferProcedureInput<P>`, `inferProcedureOutput<P>`, `inferSubscriptionInput<P>`, `inferSubscriptionOutput<P>` (the yielded type), `inferRouterInputs<R>`, `inferRouterOutputs<R>`, `inferRouterContext<R>`, `AnyTRPCProcedure`, `AnyTRPCRouter`, `TRPCRouterRecord`, `TRPCQueryProcedure`, `TRPCSubscriptionProcedure`, `TrackedEnvelope`, and `tracked`.

- `inferProcedureInput` returns `void | Input` when the input may be undefined, so a no-input fixture can be `() => ...` [`procedure.ts` line 84].
- `inferRouterOutputs` applies `Serialize<>` when there is no transformer, so it gives the JSON shape the client sees [S24]. For a subscription it is the serialized async iterable, not the yield type; use `inferSubscriptionOutput` or the client-side `inferOutput` for the yield.
- There is no exported "procedure by dotted path" type. The `ProcedurePath`/`ProcedureAt` pair above walks `AppRouter['_def']['record']`, which is the same record `inferRouterInputs` uses [S24].

### Tests with `createCaller`

```ts
const createCaller = createCallerFactory(appRouter);
const caller = createCaller({ services: mockServices });
await caller.system.info();
for await (const tick of await caller.system.clock()) { /* ... */ break; }
```

Verified: a subscription called through the caller resolves to an async iterable. `createCaller(ctx, { onError?, signal? })` takes an optional `signal`; without it the procedure's `signal` is `undefined` [S9, `router.ts` `RouterCaller`]. The docs warn not to use `createCaller` inside other procedures [S9].

### React Native and other clients

- React Native has a built-in global `WebSocket` [S28]; `createWSClient` uses `globalThis.WebSocket` by default [S21], so the `ws` package is not needed on any client.
- Node 24 has a stable global `WebSocket` (stable since 22.4) [S27], so Vitest or scripts can use `createWSClient` without a ponyfill (verified on Node 24.21.0).
- tRPC's compiled output polyfills `Symbol.asyncDispose` and lowers `await using`, so Hermes needs no extra polyfill for those (seen in `@trpc/server/dist` and `@trpc/client/dist` 11.19.0).
- TanStack Query does not detect focus or network on React Native by itself; wire `focusManager` to `AppState` and `onlineManager` to `expo-network` or NetInfo [S29].

## pnpm + Turborepo monorepo specifics

- `@trpc/client` and `@trpc/tanstack-react-query` peer-depend on `@trpc/server` at the exact same version (`11.19.0`, no range) [S1]. Put all three `@trpc/*` packages in the catalog at one version so `sherif` and pnpm agree; a mismatch gives a peer warning.
- `packages/client` should list `@trpc/server` itself, as a peer target for `@trpc/client` and for the `@trpc/server/observable` import in the mock link [S1].
- `packages/client` imports the router only as `import type { AppRouter } from '@repo/api'`, so no server code is bundled [S12]. Add `@repo/api` as `workspace:*` (a devDependency is enough for type-only use). Spec section 4 already allows this ("`api` (types only, `import type`)").
- Because the type comes from `api` source, `tsc` in `packages/client` also checks the types `api` pulls in (`@trpc/server`, `zod`, `contracts`). Both packages must resolve the same `zod` and `@trpc/server` versions, which the catalog gives. tRPC requires TypeScript >=5.7.2 and strongly recommends `strict: true` [S2]; keep `strict` on in the shared base config.
- `ws` and `@types/ws` belong only in `apps/server` (spec section 4 forbids Node APIs in `api` and `client`). `@trpc/server/adapters/ws` deliberately does not import `ws` at runtime [S19 comment, "Importing ws causes a build error"], so `packages/api` can stay free of `ws`.
- `bufferutil` and `utf-8-validate` are optional peers of `ws`; skip them [S1, S26].

## Gotchas

1. **`signal` can be `undefined`.** Spec section 4's `SystemService.clock(signal: AbortSignal)` plus `yield* ctx.services.system.clock(signal)` does not compile under `strict` (verified). Fix in the service type (`AbortSignal | undefined`) or in the procedure. This is a small spec correction; ask the owner before changing the spec's signature.
2. **`.output()` on a subscription.** It validates the whole iterable, not each item: type error at compile time, `Output validation failed` at runtime (verified, [S23]). Use `zAsyncIterable` [S3] or `ClockTick.parse()` inside the generator.
3. **Queries fail on disconnect; subscriptions resume.** When the socket closes, pending queries and mutations error at once with a `TRPCClientError`; subscriptions are kept and re-sent after reconnect [S20]. TanStack Query's retry covers queries; `useSubscription` shows `connecting` with the error meanwhile [S22].
4. **Stale subscription input on reconnect.** The re-sent subscription uses its original input plus `lastEventId`; there is no hook to recompute it [S25]. Use `tracked()` for anything that must resume without gaps (relevant to `feed.subscribe` in milestone 1).
5. **Listen before reading history.** In a subscription that sends history then live events, start listening before the history query, or events in between are lost [S25].
6. **No transformer means JSON only.** `Date`, `Map`, and `undefined` inside arrays do not survive; `inferRouterOutputs` shows the serialized type [S24]. The contracts' `z.iso.datetime()` strings fit this.
7. **Mock subscriptions must send `started`.** `useSubscription` stays `connecting` until a `started` envelope or a data item arrives; a `state: 'pending'` envelope alone does nothing [S22].
8. **The ws keep-alive is text `PING`/`PONG`, not WebSocket ping frames.** Both sides answer the other's `PING` unless `dangerouslyDisablePong` is set [S19, `wsConnection.ts`]. Turning on keep-alive on both sides is safe.
9. **tRPC recommends SSE over WebSocket for subscriptions** [S3, S25]. ADR-0002 already chose one WebSocket for every call and rejected two transports; nothing here contradicts that ADR, but expect the docs to steer toward `httpSubscriptionLink`.
10. **`useTRPC()` needs both providers.** `TRPCProvider` does not include `QueryClientProvider` [S7]. The Storybook `withTrpcMocks` decorator must render both, with a `QueryClient` built with `retry: false` (spec section 8).
11. **Cleartext on device.** React Native's docs say iOS ATS and Android API 28+ block cleartext `http://` by default [S28]; they do not say whether `ws://127.0.0.1` is affected. Check it in spike check 2 on the iOS simulator and Android emulator.
