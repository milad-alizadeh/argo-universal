# Spec 0001: Scaffold and spike

This spec says exactly what the first scaffold builds. The reasons are in `docs/adr/`. The words are in `GLOSSARY.md`. When this spec and an ADR disagree, stop and ask the owner.

## 0. Method

Generate files with each tool's official scaffold CLI, then move the output into the folder tree in section 3. Write a file by hand only when no generator makes it.

### Step 1: research

Before you generate anything, send one `/research` subagent per tool. Each subagent reads the current installation docs and the documented best practices and configuration for its tool, and writes `docs/research/<tool>.md`. The note starts with a linked table of its sources. It then gives the install command, the generator command and its prompts, the configuration the tool recommends, and the parts that are specific to a pnpm and Turborepo monorepo.

Tools:

- Turborepo and pnpm workspaces with catalogs, plus `sherif`
- Expo, Expo Router, and `expo-dev-client`
- Uniwind and React Native Reusables
- Storybook for React Native Web with Vite and the Vitest addon
- Storybook for React Native on device
- Electron
- Playwright, Playwright for Electron included
- tRPC 11 with TanStack Query and WebSocket
- Drizzle with `node:sqlite`
- XState 5
- Biome, Vitest, and Maestro

The research is done when every tool has a note, and every generator command in step 2 comes from a note.

### Step 2: generate

Use these commands as written:

- The universal app: `npx create-expo-app@latest`
- Storybook: `npm create storybook@latest`, once in `apps/storybook` for web and once in `apps/universal-app` for on device. Follow its instructions precisely.

Use the official generator for every other tool that has one, as its research note names it. Examples are `npx @react-native-reusables/cli init -t minimal-uniwind`, `npm init playwright@latest`, `biome init`, and `drizzle-kit generate`.

### Step 3: fit

Move and rename the generated files into the tree in section 3. Keep each generator's configuration. Change it only where this spec or an ADR needs a change, and write a one-line comment that names the reason. If a generator's output or instructions conflict with an ADR, stop and ask the owner.

## 1. Goal and scope

The scaffold builds every app and package in the agreed layout, wires them end to end with one small path, and proves four unproven parts (the spike, section 12).

In scope:

- Every folder in section 3, with its `package.json`, `tsconfig.json`, and entry files.
- The toolchain (section 2), the root scripts (section 10), and CI (section 11).
- The Server supervisor and worker, with `system.info` and `system.clock` (section 5).
- The full Zod contracts for the Feed (section 6) and the full Drizzle schema with its first migration (section 7). These are types and tables only. Nothing produces Session updates yet.
- The two agreed routes. In the scaffold, `ProjectsScreen` in `packages/client` shows `system.info` and the live `system.clock` value, in the universal app, in Electron, and in both Storybooks. `SessionScreen` is a placeholder that shows its `id`. Milestone 1 replaces both.

Out of scope (milestone 1 and later):

- Agent adapters, the Feed projector, Session machines, git and worktree work, Projects, and Sessions. `packages/agents` and `packages/git` hold only an `index.ts` that exports nothing yet.
- Code from Argo. Reuse comes later, one piece at a time.
- Milestone 1 itself: one Project, one Claude Session and one Codex Session in their Checkouts, with the Feed shown as raw JSON and paged.
- Authentication, phone pairing, and any address other than `127.0.0.1`.
- Release packaging, signing, and auto-update for Electron.

## 2. Toolchain

| Item | Value |
|---|---|
| Package manager | pnpm, pinned in `packageManager`. Workspaces: `apps/*`, `packages/*`, `tooling/*`. |
| Versions | Every shared dependency comes from a pnpm catalog in `pnpm-workspace.yaml`. Packages refer to it as `catalog:`. |
| Version check | `sherif` runs in `postinstall` and in `pnpm quality`, and fails on a mismatch. |
| Task runner | Turborepo (`turbo.json`). |
| Node | 24, pinned in `.node-version` and in `engines`. The Server and Electron run on Node. |
| Lint and format | Biome, one `biome.jsonc` at the root that extends `tooling/biome`. |
| Types | `tsc --noEmit` per package. Base configs in `tooling/typescript`. |
| Language | TypeScript, ESM everywhere. Node scripts are `.mts`. |
| Server runner | `tsx` (`tsx watch` in dev). |
| Unit tests | Vitest, one root `vitest.config.ts` with projects. |

Use the newest stable version of each tool on the day you scaffold. Drizzle is the exception: use the newest 1.0 release candidate. Record every version you picked in the catalog. Make sure that Expo is SDK 54 or newer, that Drizzle supports `drizzle-orm/node-sqlite` (Argo uses `drizzle-orm` 1.0.0-rc), that Zod is 4, that XState is 5, and that tRPC is 11.

Package names use the `@argo/` scope: `@argo/universal-app`, `@argo/desktop`, `@argo/server`, `@argo/storybook`, `@argo/contracts`, `@argo/api`, `@argo/db`, `@argo/agents`, `@argo/git`, `@argo/client`, `@argo/typescript`, `@argo/uniwind`, `@argo/biome`.

## 3. Folder tree

```
argo-universal/
├── apps/
│   ├── universal-app/              Expo app for iOS, Android, and web
│   │   ├── src/app/
│   │   │   ├── _layout.tsx         imports global.css, renders <AppProviders> from @argo/client
│   │   │   ├── index.tsx           renders <ProjectsScreen/>
│   │   │   ├── sessions/[id].tsx   renders <SessionScreen/>
│   │   │   └── (dev)/storybook.tsx on-device Storybook, only in development builds
│   │   ├── .rnstorybook/           main.ts, preview.tsx, index.ts
│   │   ├── maestro/                one smoke flow: launch, Projects screen shows the Server version
│   │   ├── global.css              Uniwind entry
│   │   ├── metro.config.js
│   │   └── app.json
│   ├── desktop/                    Electron shell
│   │   └── src/
│   │       ├── main/               window, app:// protocol, Server start and reuse
│   │       └── preload/            exposes the Server address and window controls
│   ├── server/
│   │   └── src/
│   │       ├── supervisor/         lifecycle machine, heartbeat, backoff, server.json
│   │       ├── worker/             HTTP and WebSocket server, tRPC adapter, /health, /blobs/:id
│   │       ├── services/
│   │       │   └── system/         info.ts, clock.ts, index.ts (createSystemService)
│   │       └── main.ts             starts the supervisor
│   └── storybook/                  web Storybook
│       └── .storybook/             main.ts, preview.tsx, vitest.setup.ts
├── packages/
│   ├── contracts/src/              Zod schemas only, derived from db tables where a table holds the shape
│   │   ├── system/                 info.ts, clock.ts, server-address.ts, index.ts
│   │   ├── feed/                   page.ts, row.ts, subscribe.ts, session-update.ts, index.ts
│   │   ├── sessions/               new.ts, prompt.ts, cancel.ts, list.ts, close.ts, delete.ts,
│   │   │                           set-config-option.ts, snapshot.ts, turn.ts, index.ts
│   │   └── index.ts
│   ├── api/src/
│   │   ├── system/                 info.ts, clock.ts, service.ts (SystemService), router.ts
│   │   ├── services.ts             Services = { system: SystemService }
│   │   ├── trpc.ts                 context { services }, router, publicProcedure
│   │   └── root.ts                 appRouter and the AppRouter type
│   ├── db/src/                     Drizzle schema (@argo/db/schema, no Node APIs), client, migrations in db/drizzle/
│   ├── agents/src/                 index.ts only (claude/ and codex/ come in milestone 1)
│   ├── git/src/                    index.ts only
│   └── client/
│       ├── src/
│       │   ├── primitives/         React Native Reusables components
│       │   ├── components/<feature>/
│       │   ├── screens/            ProjectsScreen.tsx, ProjectsScreen.mocks.ts, ProjectsScreen.stories.tsx,
│       │   │                       ProjectsScreen.test.stories.tsx, SessionScreen.tsx (placeholder)
│       │   ├── trpc/               createTRPCContext, client factory, AppProviders
│       │   └── index.ts
│       └── mocks/                  trpc-mock-link.ts, pending(), fails(), feed/ (generated, empty now)
├── e2e/
│   ├── projects/projects.spec.ts   Projects screen shows the Server version and a ticking clock
│   └── playwright.config.ts        projects: web, electron
├── mocks/cli/
│   ├── claude/                     README.md only (mock CLI and recordings come in milestone 1)
│   └── codex/                      README.md only
├── tools/                          .mts scripts (generate-feed-fixtures.mts comes in milestone 1)
├── tooling/
│   ├── typescript/                 base.json, node.json, react-native.json
│   ├── uniwind/                    theme.css (tokens in @theme)
│   └── biome/                      biome.jsonc
├── docs/adr/  docs/specs/  docs/research/
├── .github/workflows/ci.yml
├── AGENTS.md  GLOSSARY.md  README.md  LICENSE (MIT)
├── .node-version  package.json  pnpm-workspace.yaml  turbo.json  biome.jsonc  vitest.config.ts
```

## 4. Dependency rules

| Package | Can import | Never imports |
|---|---|---|
| `contracts` | `zod`, `drizzle-orm` (`drizzle-orm/zod`), `@argo/db/schema` | anything else, including the `@argo/db` client |
| `api` | `contracts`, `@trpc/server` | `db`, `agents`, `git`, Node APIs |
| `db` | `drizzle-orm`, `node:sqlite` | `contracts`, `api`, `agents`, `git` |
| `agents` | `contracts`, vendor SDKs | `db`, `api`, `git` |
| `git` | `contracts`, `node:child_process` | `db`, `api`, `agents` |
| `client` | `contracts`, `api` (types only, `import type`), tRPC client, TanStack Query, React Native, Uniwind | `db`, `agents`, `git`, Node APIs |
| `apps/server` | every server-side package | `client` |
| `apps/universal-app` | `client` | server-side packages |
| `apps/desktop` | `electron`, `contracts` (for the `server.json` schema) | `client`, `api`, `db` |
| `apps/storybook` | `client` | server-side packages |

### Domain folders

Code is split by domain, and each domain has one file per procedure. The same domain name is used in three places:

| Place | Holds |
|---|---|
| `packages/contracts/src/<domain>/` | the Zod schemas for each procedure, plus shapes that the domain shares, such as a Session update or the Session snapshot |
| `packages/api/src/<domain>/` | one file per procedure, the domain's service interface in `service.ts`, and `router.ts` |
| `apps/server/src/services/<domain>/` | one file per procedure that implements the service method, the domain's internals, and `index.ts` with `create<Domain>Service(deps)` |

The domains are `system` in the scaffold, and `projects`, `sessions`, `feed`, and `checkouts` in milestone 1. The scaffold writes the contracts for `system`, `feed`, and `sessions` (section 6), and the api and server folders for `system` only. A domain's internals, such as the Session machines, the Feed projector, and the writer queue, live in its server folder. Other code imports a domain folder only through its `index.ts`. Contracts stay in `packages/contracts`, because `client`, `agents`, and `desktop` import them and must not import from `apps/server` or `api`.

### Services

`api` defines its routers against a `Services` interface in its tRPC context. `apps/server` builds the real services from `db`, `agents`, and `git`, and passes them in. A router only validates input and output with `contracts` schemas and calls one service method.

```ts
// packages/contracts/src/system/info.ts
export const SystemInfo = z.object({ version: z.string(), startedAt: z.iso.datetime(), pid: z.number().int() });
export type SystemInfo = z.infer<typeof SystemInfo>;

// packages/api/src/system/service.ts: types come from contracts only
export interface SystemService {
  info(): SystemInfo;
  clock(signal: AbortSignal): AsyncIterable<ClockTick>;
}

// packages/api/src/services.ts
export interface Services {
  system: SystemService;
  // milestone 1 adds: projects, sessions, feed, checkouts
}

// packages/api/src/system/info.ts
export const info = publicProcedure.output(SystemInfo).query(({ ctx }) => ctx.services.system.info());

// packages/api/src/system/clock.ts
export const clock = publicProcedure.subscription(async function* ({ ctx, signal }) {
  yield* ctx.services.system.clock(signal);
});

// packages/api/src/system/router.ts
export const systemRouter = router({ info, clock });

// apps/server/src/services/system/index.ts
export const createSystemService = (deps: SystemDeps): SystemService => ({
  info: () => info(deps),
  clock: (signal) => clock(signal),
});

// apps/server/src/worker/start.ts
const services: Services = { system: createSystemService({ version, startedAt }) };
applyWSSHandler({ wss, router: appRouter, createContext: () => ({ services }) });
```

Vitest tests for `api` call the routers with `createCaller` and mock services, with no database. A vendor name (`claude`, `codex`) appears only inside `packages/agents/<agent>/`.

## 5. Server

### Runtime layout

| Path | Content |
|---|---|
| `~/.argo/argo.db` | SQLite database, WAL mode |
| `~/.argo/server.json` | `{pid, port, version, startedAt}`, written to a temp file and renamed |
| `~/.argo/blobs/<sha256>` | blob files |
| `~/.argo/worktrees/<projectId>/<slug>` | worktrees (milestone 1) |
| `~/.argo/logs/` | supervisor and worker logs |

`ARGO_HOME` overrides `~/.argo`. Tests set it to a temp folder.

### Supervisor

`apps/server/src/supervisor/` holds an XState 5 machine and a small runner, about 100 lines. The supervisor imports no app code, only `contracts` for the `server.json` schema.

- States: `starting`, `running`, `backingOff`, `failed`, `stopping`.
- `starting` forks the worker with `child_process.fork` and waits for a `ready {port}` message.
- `running` writes `server.json` and expects a `heartbeat` message from the worker. A missed heartbeat or a worker exit goes to `backingOff`.
- `backingOff` waits, forks the worker again, and goes to `running` on `ready`, or to `failed`. The delay doubles from a base to a cap.
- `failed` is final when the worker crashes too often in a window. It removes `server.json` and exits with a non-zero code.
- `stopping` runs on `SIGINT` and `SIGTERM`: it stops the worker, removes `server.json`, and exits.
- In dev, the supervisor forks the worker under `tsx watch`, so a file change restarts only the worker.

### Worker

- One `node:http` server on `127.0.0.1`, on the port in `ARGO_SERVER_PORT`, with 7337 as the default. The supervisor writes the port that the worker uses into `server.json`.
- `GET /health` returns `{ok: true, version, startedAt}`.
- `GET /blobs/:id` streams the file from `~/.argo/blobs/`. It returns 404 for an unknown id.
- A `ws` server on the same port, with tRPC's `applyWSSHandler` and `@argo/api`'s `appRouter`.
- On start, it opens the database and runs the Drizzle migrations from `packages/db/drizzle/`.
- Scaffold procedures: `system.info` (query, returns `{version, startedAt, pid}`) and `system.clock` (subscription, sends `{now}` every second).

## 6. Contracts

`packages/contracts` holds these Zod schemas. Infer every TypeScript type from its schema. Use ACP's exact field spelling. Where a `db` table holds a shape, derive the schema from the table with `drizzle-orm/zod` and add only the fields the API adds (ADR 0013).

### Session update envelope

The `id` comes from the vendor where the vendor has a stable id: Codex `item.id`, Claude `tool_use.id` for tools and `message.id#blockIndex` for text. The streamed version and the final version of a row then have the same `id`.

```ts
{ id: string, sessionId: string, position: number, revision: number, turnId: string | null,
  state: 'open' | 'settled', sessionUpdate: <kind>, ...payload, _meta?: { argo?: {...} } }
```

### Session update kinds

| `sessionUpdate` | Payload |
|---|---|
| `user_message` | `{messageId, content: ContentBlock[]}` |
| `agent_message` | `{messageId, content: ContentBlock[]}` |
| `agent_thought` | `{messageId, content: ContentBlock[]}` |
| `tool_call_update` | `{toolCallId, title, name?, kind: ToolKind, status: ToolCallStatus, content: ToolCallContent[], locations?: {path, line?}[], rawInput?, rawOutput?}`. `_meta.argo`: `{truncated?, permissionOutcome?}` |
| `plan_update` | `{plan: {type: 'items', planId, entries: PlanEntry[]} \| {type: 'markdown', planId, content: string}}`. `_meta.argo` on a markdown plan: `{requestId?, filePath?}` |
| `compaction_update` | `{compactionId, status: 'in_progress' \| 'completed' \| 'failed' \| 'cancelled', summary?}` |
| `subagent_update` | `{sessionId: <child Session id>, title?, state?: 'running' \| 'idle' \| 'requires_action'}` |
| `notice` | `{severity: 'info' \| 'warning' \| 'error', title, description?}`. `_meta.argo`: `{retry?: {attempt, maxAttempts, delayMs}, unrecognised?: {excerpt}}` |
| `task_update` | Argo extension: `{taskId, status: 'running' \| 'completed' \| 'failed' \| 'cancelled', title}` |

Shared types:

- `ContentBlock`: `text {text}`, `image {mimeType, blob: BlobRef}`, `resource_link {name, uri, mimeType?}`, `resource {resource: {uri, text?, mimeType?}}`. An attachment carries `_meta.argo.source: 'upload' | 'pasted'`.
- `BlobRef`: `{blobId, mime, bytes, width?, height?}`.
- `ToolKind`: `read`, `edit`, `delete`, `move`, `search`, `execute`, `think`, `fetch`, `switch_mode`, `other`.
- `ToolCallStatus`: `pending`, `in_progress`, `completed`, `failed`, `cancelled`.
- `ToolCallContent`: `content {content: ContentBlock}`, `diff {changes: {operation: 'add' | 'delete' | 'modify' | 'move', path, oldPath?, oldText?, newText?}[], patch?: {format: 'git_patch', text}}`, `terminal {command, cwd?, output, exitStatus?}`.
- `PlanEntry`: `{content, priority: 'high' | 'medium' | 'low', status: 'pending' | 'in_progress' | 'completed' | 'cancelled'}`. `_meta.argo`: `{activeForm?}`.

### Outside the rows

- `SessionSnapshot`: `{state: 'running' | 'idle' | 'requires_action', activeTurnId, usage, pendingPermission, pendingElicitation, configOptions, maxRevision, epoch}`.
  - `pendingPermission` has the shape of ACP `session/request_permission`: `{toolCallId, title, options: {optionId, name, kind: 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always'}[]}`.
  - `pendingElicitation` has the shape of ACP `elicitation/create` in form mode.
  - `usage` has the shape of ACP `usage_update`: `{used, size, cost?: {amount, currency}}`.
  - `configOptions` holds mode, model, and effort as ACP v2 config options.
- `Turn`: `{id, sessionId, status, stopReason: 'end_turn' | 'max_tokens' | 'max_turn_requests' | 'refusal' | 'cancelled' | 'error' | null, error?, usage?, startedAt, endedAt}`.
- `ServerAddress`: the `server.json` schema `{pid, port, version, startedAt}`.

### Feed procedures (schemas now, routers in milestone 1)

- `feed.page` query. Input `{sessionId, direction: 'tail' | 'before', cursor?: position, limit = 40 (max 200)}`. Output `{epoch, maxRevision, rows, hasOlder, startCursor, staleCursor}`.
- `feed.subscribe` subscription. Input `{sessionId, after: {epoch, revision} | null}`. Emits one of:
  - `row.upsert {rev, row}`
  - `row.append {rev, id, field, off, text}`. The App applies it only if `off` equals its current length of that field. Otherwise it fetches that one row again with `feed.row`.
  - `row.patch {rev, id, set}`
  - `snapshot {snapshot}`
  - `reset {epoch}`
- `feed.row` query. Input `{sessionId, id}`. Output the row.
- Session procedures, named after ACP methods: `session.new`, `session.prompt`, `session.cancel`, `session.list`, `session.close`, `session.delete`, `session.setConfigOption`.

## 7. Database

`packages/db` holds the Drizzle schema for all six tables and the first migration. The schema also holds the enums that columns use, and `contracts` derives from it (ADR 0013). Store each payload as JSON text. The Server validates it with the `contracts` schema on write and on read.

| Table | Columns |
|---|---|
| `project` | `id`, `path`, `name`, `createdAt` |
| `session` | `id`, `projectId`, `agent`, `vendorSessionId`, `parentSessionId`, `checkoutPath`, `checkoutBranch`, `vendorRef` (JSON), `epoch`, `projectionVersion`, `maxRevision`, `createdAt`, `updatedAt` |
| `turn` | `id`, `sessionId`, `status`, `stopReason`, `error` (JSON), `usage` (JSON), `startedAt`, `endedAt` |
| `feed_row` | `sessionId`, `position`, `id`, `sessionUpdate`, `revision`, `turnId`, `state`, `payload` (JSON), `payloadVersion`, `sourceRef` (JSON), `searchText`, `createdAt`, `updatedAt`. Primary key `(sessionId, position)`. Unique `(sessionId, id)`. Index `(sessionId, revision)` and `(sessionId, sessionUpdate, position)`. |
| `blob` | `id` (sha256), `mime`, `bytes`, `width`, `height`, `createdAt` |
| `blob_ref` | `blobId`, `sessionId`. Primary key `(blobId, sessionId)`. When a Session is deleted, its refs go, and a blob file with no ref left is deleted. |

The Session's current Plan is not stored. A query reads it from the newest `plan_update` row of type `items`. Full-text search comes later.

## 8. Client package

- `src/trpc/`: `createTRPCContext<AppRouter>()` gives `TRPCProvider` and `useTRPC()`. `createArgoClient(url)` builds a client with `wsLink` and `createWSClient`. `AppProviders` holds the `QueryClient`, the tRPC provider, and the Server URL.
- Screens get tRPC only from `useTRPC()`.
- `src/primitives/`: run `npx @react-native-reusables/cli init -t minimal-uniwind` and point its output here. Add only the primitives that the Projects screen uses.
- `mocks/trpc-mock-link.ts`: a `TRPCLink` that serves fixtures by procedure path. The fixture map is typed from `AppRouter` with `inferProcedureInput` and `inferProcedureOutput`, so a wrong procedure path or a wrong fixture shape fails `tsc`. A subscription fixture is an async generator. `withTrpcMocks` is the story decorator. It reads `parameters.trpc`, builds a `QueryClient` with `retry: false`, and wraps the story in the providers. A missing fixture fails with `No story mock for <path>`.
- `mocks/` also exports `pending()` (never answers) and `fails(message)` (always errors).
- `ProjectsScreen.mocks.ts` holds the default fixture for each procedure that the screen calls. A story overrides one procedure at most.
- Each screen has four states at most: loading, empty, loaded, error.
- The Server URL in the universal app comes from `EXPO_PUBLIC_ARGO_SERVER_URL`. Its default is `ws://127.0.0.1:7337`. In Electron it comes from the preload script.

## 9. Apps

### Universal app

- Expo Router with routes in `src/app/`. Web uses Metro.
- `metro.config.js`: `withUniwindConfig` is the outermost wrapper.
- `global.css`: imports Tailwind and Uniwind, imports `@argo/uniwind/theme.css`, and adds `@source` for `../../packages/client/src`.
- Install `expo-dev-client`. Add a dev menu item that opens `/(dev)/storybook`. The route renders nothing in a production build.
- `.rnstorybook/main.ts` reads `../../packages/client/src/**/*.stories.tsx` and leaves out `*.test.stories.tsx`.
- Android emulator: use `adb reverse tcp:7337 tcp:7337` so that `127.0.0.1` works.

### Desktop

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- In production, a custom `app://` protocol serves the Expo web export from `apps/universal-app/dist`. In dev, the window loads the Expo web dev URL.
- On launch, read `~/.argo/server.json` and call `/health`. If the Server answers with the same version, reuse it. If the version differs, restart it. If no Server answers, start `apps/server` (the supervisor) as a detached process. On quit, stop the Server only if this app started it.
- Preload exposes `window.argo = {serverUrl, window: {minimize, maximize, close}}` and nothing else.

### Web Storybook

- `@storybook/react-native-web-vite` with `@storybook/addon-vitest`.
- Stories come from `../../packages/client/src/**/*.stories.tsx`, `*.test.stories.tsx` included.
- `preview.tsx` adds `withTrpcMocks` and imports the Uniwind CSS.

## 10. Root scripts

| Script | Does |
|---|---|
| `pnpm dev` | `turbo dev`: the Server (supervisor with the worker under `tsx watch`), the universal app (`expo start` for web and Metro), and desktop. Desktop waits until `server.json` exists and the Expo web URL answers. |
| `pnpm dev:storybook` | web Storybook only |
| `pnpm quality` | `sherif`, `biome check`, `tsc` in every package, Vitest, and the Storybook Vitest tests |
| `pnpm test:e2e` | Playwright `web` project against the Expo web export |
| `pnpm test:e2e:electron` | Playwright `electron` project |
| `pnpm db:generate` | Drizzle migration generation in `packages/db` |

## 11. CI

`.github/workflows/ci.yml` on `ubuntu-latest`:

1. On every pull request and every push to `main`: install with pnpm, `pnpm quality`, export the Expo web build, `pnpm test:e2e`.
2. Only on `main` and `release/*`: `pnpm test:e2e:electron` under `xvfb-run`.

No mobile job. Maestro runs only on the developer machine.

## 12. Spike checks

Each check must pass before the scaffold is done. If a check fails, stop and report to the owner with the error output. Do not switch to a fallback without the owner's answer.

1. Web Storybook with the Vitest addon runs `ProjectsScreen.test.stories.tsx` with a play function, and Uniwind classes apply. Fallback to propose: Playwright component tests against the web build.
2. The tRPC mock link renders `ProjectsScreen` with a `system.info` fixture and a `system.clock` generator, in web Storybook and in on-device Storybook on the iOS simulator.
3. One Playwright spec (`e2e/projects/projects.spec.ts`) passes in the `web` project and in the `electron` project.
4. The Server runs under `tsx watch` with `ws` and `node:sqlite`: the migrations run, `/health` answers, and a file change restarts only the worker while the supervisor keeps running.

Also make sure that:

- `pnpm dev` starts all three, and the Projects screen shows a ticking clock on web, in Electron, and on the iOS simulator.
- The Maestro flow passes on the iOS simulator.
- `pnpm quality` passes, and `sherif` reports no mismatch.
- Killing the worker process makes the supervisor restart it, and `server.json` keeps the same supervisor PID.
