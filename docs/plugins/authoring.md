# Write, validate and test a Plugin

A Plugin is a TypeScript project. Its `package.json` depends on `@argo/plugin-kit` alone, which provides the components, the `Argo` type of the Plugin API, the test kit and the `argo-plugin` command. Plugins in this repository take the kit from the workspace:

```json
{
  "name": "@argo/hello",
  "private": true,
  "type": "module",
  "scripts": {
    "check-types": "tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
    "test": "argo-plugin test .",
    "validate": "argo-plugin validate ."
  },
  "devDependencies": {
    "@argo/plugin-kit": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  }
}
```

Its `tsconfig.json` extends the kit's settings, and its `tsconfig.test.json` the kit's test settings:

```json
{ "extends": "@argo/plugin-kit/tsconfig.json" }
```

```json
{ "extends": "@argo/plugin-kit/tsconfig.test.json" }
```

Plugin code runs without Node, so it is checked without Node's types; only `*.test.ts` files see them.

`plugin.json` stays the manifest. Its `main` names the entry, which can be `.ts` or `.tsx`. The entry exports `register`, which receives the Plugin API:

```tsx
import { Text, type Argo } from '@argo/plugin-kit';

export function register(argo: Argo): void {
  argo.pages.register('/', () => <Text>Hello</Text>);
}
```

Run the commands from the Plugin folder:

```sh
pnpm validate
pnpm test
```

`argo-plugin <validate|test> <dir>` accepts an absolute or relative Plugin directory. The Server's `argo plugin <validate|test> <dir>` runs the same command.

## Source validation

`argo-plugin validate <dir>` uses the manifest reader and bundler that the Plugin loader uses.
It reports Hook registrations, `argo` calls, and Slot registrations from the entry and its imports.
Diagnostics include the file, line, column, and refusal reason. A refused Plugin produces a non-zero exit code.

The command checks source without starting the Plugin or running its machine calls.
Source inspection reports literal Hook and Slot names. Computed registrations need tests that exercise those registrations.
For literal visual props in JSX, validation uses the Server checks and reports the node and refusal reason.
These checks cover `Svg` markup, `Chart` series, and `Canvas` scenes from amended ADR-0028.
`CodeMap` is unsupported; use `Canvas`. Computed visual data needs a mount test.
Chart and Canvas rendering remains part of the visual-parts work (#959).

## Plugin tests

Put tests in files named `*.test.js`, `*.test.mjs`, or `*.test.ts` inside the Plugin directory.
The command discovers these files recursively and skips `node_modules`.
Import `test` from `@argo/plugin-kit/testing`:

```ts
import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('a press changes the page', async ({ mount }) => {
  const page = await mount({ page: '/', surface: { platform: 'web' } });

  await page.press('Increment');
  assert.equal((await page.find('Count: 1')).type, 'Text');
});
```

Each test receives a fresh Plugin host and temporary storage. The command closes the host and removes the storage after each test.
A failed assertion, empty test file, missing test file, or test timeout produces a non-zero exit code.
Each test has a ten-second time limit.

The test host uses the production loader, worker, Hook chain, wire preparation, and checked dispatch.
Tests run local Plugin code and use its declared Capabilities. Executable fixtures remain necessary for tests that run external commands.

## Test kit

| API | Behavior |
| --- | --- |
| `mount({ page, surface })` | Opens a page with the chosen App platform. |
| `mount({ slot, surface })` | Opens an ordinary Slot with its `slotId` and context. |
| `view.find(text)` | Waits for a matching node and returns its wire data. |
| `view.press(text)` | Sends `onPress` through the production dispatch path. |
| `clock.advance(ms)` | Advances Plugin timers, dates, Query intervals, background passes, and Hook deadlines together. The kit keeps its real rendering scheduler. |
| `settings` | Provides a Map with the manifest defaults. Changes reach `argo.settings.get`. |
| `storage.execute(queries)` | Reads or seeds the isolated Plugin SQLite database through the production storage API. |
| `session` | Provides test Session, Project, and Agent identifiers. |
| `emit(name, event)` | Checks an event and raises it through the production Hook chain. |

`find` matches a label, title, text, text content, or accessible label. It waits up to three seconds.
The chosen surface sets `ctx.surface.platform`; the test App always speaks the current Plugin wire version. The kit does not open an App or draw native pixels.

`mount` accepts `projectId` for a Project page.
Use the same `connectionId` on overlapping mounts to model subscriptions from one App Connection. Omitting it creates a fresh Connection.
Closing a view releases only its subscription.

For a Project details Slot, use the same input that the Server receives:

```ts
const view = await mount({
  slot: {
    slotId: 'argo/project/details/v1',
    context: { projectId: session.projectId },
  },
  surface: { platform: 'ios' },
});
```

For a Hook test, use the returned result from the real chain:

```ts
const answer = await emit('prompt.submit', {
  sessionId: session.id,
  projectId: session.projectId,
  prompt: [{ type: 'text', text: 'Hello' }],
});
assert.deepEqual(answer, { prompt: [{ type: 'text', text: '[checked] Hello' }] });
```

## Declared data

Use `useData` to describe a read. Argo runs the Query, shares its answer, and releases the registration when the component unmounts.

```tsx
import { Label, useData, type Argo } from '@argo/plugin-kit';

export function register(argo: Argo): void {
  argo.slots.register('argo/session/row/v1', ({ context: { projectId, branch } }) => {
    const { data, error } = useData(
      branch === null
        ? null
        : { api: 'process', action: 'run', argv: ['forge', 'list', '--json'] },
      { every: 30_000 },
    );

    return <Label text={error ?? data?.stdout ?? projectId} />;
  });
}
```

Declare the command's Capability in `plugin.json`. A process Query uses the declaring view's Project folder unless the Query specifies `cwd`.
A fetch Query accepts the same fields as `argo.fetch`, including POST requests. A storage Query contains `queries`, each with a read method: `get`, `all`, or `values`.
Other `argo` calls are not Queries. Storage Queries use a read-only connection; writes through another read method are also refused.

The hook returns `{ data, error, stale, refresh }`:

- `data` contains the call's answer and retains the last successful value.
- `error` describes a refused call, missing Account, transport failure, or Argo timeout. An HTTP 401 remains fetch data.
- `stale` is true only while refreshing an existing answer.
- `refresh()` runs the Query now and joins a call already in flight.

`useData(null)` creates no entry. Without `every`, a Query runs once per mount.
Argo clamps `every` to ten seconds and logs the clamp once. Shared viewers use their smallest interval.
Storage Queries are never polled. A committed Plugin storage write marks them due.

Entries belong to a Plugin and a Project. Equal Queries in that Project share one entry, including Queries from different Slots.
Object key order and header name case do not change the entry.
**A Query built from a row's own `sessionId` or `branch` makes one call per row.**
To share a list, describe the same list Query in each row and select that row's value from the answer.

The Session-row Slot context is `{ sessionId, projectId, branch }`, with `branch` nullable.
Its children are the existing `ListItem.meta` parts: `Label` and `Pill`. Return a fragment to provide multiple children.
A Pill uses the kit's existing `text`, `tone`, and optional `color` props. Core adds no pull request or check schema.
App placement, meta overflow presentation, nav badge appearance, and drawing-failure toast wording remain gated on approved Paper states in #1166.

## Background pages and badges

Declare `contributes.background: { path, interval }` in `plugin.json`, and register that path as a page.
Argo activates the Plugin and mounts the page once per registered Project, with `projectId` in its context.
There is no Project-less pass. Each Plugin and Project pair owns an independent timer, with a five-minute minimum interval.
Adding a Project starts its pass. Removing one releases its views, passes, and entries.

Use the same Query in the background page and the mounted Slot to warm the same entry.
A background pass ignores a Query's `every` option. It ends after the first render's Queries settle, or after sixty seconds, and discards its tree.
A refused background Query stops retrying until the Plugin is next opened.
The optional fetch `account` field is reserved for the Account broker; it currently returns a refusal until that broker is available.

A page may call `argo.nav.badge(id, count)` for a nav id its own manifest declares. Zero clears the count.
Counts are in memory and clear when the Plugin stops or reloads. Background pages cannot raise Notifications.

A drawing throw closes only the failed view. Other pages, Slots, Hooks, and background passes continue.
The failure subscription records one non-fatal drawing failure per Plugin.

## Hooks

The core Hook events are `prompt.submit`, `tool.check`, and `process.spawn` (ADR-0038).
Both `prompt.submit` and `tool.check` carry `sessionId` and `projectId`.
The separate `ui.render` Hook draws Replaceable Slots with its existing payload and answer.

Argo sets each Hook's wall-clock budget: 2000 ms for `prompt.submit`, and 10000 ms for the other events, including `ui.render`.
Only time spent waiting on `next` stops the budget. Calls to `argo` count against it.
A two-second prompt budget deliberately does not reach a network service. A prompt Hook reads data already fetched or its own storage, or answers directly.

When a Hook exceeds its budget, Argo stops waiting, drops its return value, and logs the Plugin and event.
The worker code continues. If the Hook did not call `next`, the chain continues with the original event.
`next` is the commit point: if the Hook called it, the rest of the chain's answer stands.
A crash, malformed answer, or Plugin startup failure also leaves core free to continue.
Plugins refuse by returning an event's refusal answer. `argo.on` accepts a Hook alone or a matcher and Hook, with no options.

## Dev reload

While any Turn runs, including a subagent's, the Server keeps the current Plugin worker and defers source rebuild results.
After active Turns end, the Server rebuilds the latest source once. Intermediate syntax errors do not stop the current worker.
Outside a Turn, the existing file watcher reloads the Plugin after each build.
Turning a Plugin off releases its worker and pending rebuild.
