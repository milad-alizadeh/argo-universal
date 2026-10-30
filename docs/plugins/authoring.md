# Write, validate and test a Plugin

A Plugin is a TypeScript project. Its `package.json` depends on `@argo/plugin-kit` alone, which provides the components, the `Argo` type of the Plugin API, the test kit and the `argo-plugin` command. Plugins in this repository take the kit from the workspace:

```json
{
  "name": "@argo/github-sign-in",
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

A page is opened by the path it registers at. A `navigate` Action carries that same path, as `onPress={{ action: 'navigate', path: '/builds/web' }}`, and the App finds the route; a Plugin never writes the App's `/plugins/<Plugin id>/<nav id>` prefix. The page opens under the nav item the App is showing when its path sits below that item's `path`, and otherwise under the Plugin's nav item whose `path` holds it. A path no nav item holds is not available.

Run the commands from the Plugin folder:

```sh
pnpm validate
pnpm test
```

`argo-plugin <validate|test> <dir>` accepts an absolute or relative Plugin directory. The CLI's `argo plugin <validate|test> <dir>` runs the same command.

## Source validation

`argo-plugin validate <dir>` uses the manifest reader and bundler that the Plugin loader uses.
It reports Hook registrations, `argo` calls, and Slot registrations from the entry and its imports.
For a Plugin that hooks `ui.render`, it also reports the declared order, as `order: ui.render <n>`.
Diagnostics include the file, line, column, and refusal reason. A refused Plugin produces a non-zero exit code.

The command checks source without starting the Plugin or running its machine calls.
Source inspection reports literal Hook and Slot names. Computed registrations need tests that exercise those registrations.
For literal visual props in JSX, validation uses the Server checks and reports the node and refusal reason.
These checks cover `Svg` markup, `Chart` series, and `Canvas` scenes from amended ADR-0028.
`CodeMap` is unsupported; use `Canvas`. Computed visual data needs a mount test.
Chart and Canvas rendering remains part of the visual kit components work (#959).

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
| `slotItems(input, { signal, platform })` | Asks an items Slot for one list, as an App does, and yields each merged answer. |
| `view.find(text)` | Waits for a matching node and returns its wire data. |
| `view.press(text)` | Sends `onPress` through the production dispatch path. |
| `clock.advance(ms)` | Advances Plugin timers, dates, Query intervals, background passes, and Hook deadlines together. The kit keeps its real rendering scheduler. |
| `settings` | Provides a Map with the manifest defaults. Changes reach `argo.settings.get`. |
| `storage.execute(queries)` | Reads or seeds the isolated Plugin SQLite database through the production storage API. |
| `session` | Provides test Session, Project, and Agent identifiers. |
| `sessions` option | What `argo.sessions.get` answers, by Session id. |
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
  argo.slots.register('argo/project/details/v1', ({ context: { projectId } }) => {
    const { data, error } = useData(
      { api: 'process', action: 'run', argv: ['forge', 'list', '--json'] },
      { every: 30_000 },
    );

    return <Label text={error ?? data?.stdout ?? projectId} />;
  });
}
```

Declare the command's Capability in `plugin.json`. A process Query uses the declaring view's Project folder unless the Query specifies `cwd`. A direct `argo.process.run` call does not select the Project folder. Use a Query for commands that belong in that folder.
A fetch Query accepts the same fields as `argo.fetch`, including POST requests. A storage Query contains `queries`, each with a read method: `get`, `all`, or `values`.
Other `argo` calls are not Queries. Storage Queries use a read-only connection; writes through another read method are also refused.

The hook returns `{ data, error, stale, refresh }`:

- `data` contains the call's answer and retains the last successful value.
- `error` describes a refused call, transport failure, or Argo timeout. An HTTP 401 remains fetch data. An unavailable Account Borrow reports an error and retains the last successful data.
- `stale` is true only while refreshing an existing answer.
- `refresh()` runs the Query now and joins a call already in flight.

`useData(null)` creates no entry. Without `every`, a Query runs once per mount.
Argo clamps `every` to ten seconds and logs the clamp once. Shared viewers use their smallest interval.
Storage Queries are never polled. A committed Plugin storage write marks them due.

Entries belong to a Plugin and a Project. Equal Queries in that Project share one entry, including Queries from different Slots.
Object key order and header name case do not change the entry.

## Session row items

A Session row's meta line takes items, not a kit tree. Argo asks each Plugin that declares `argo/session/row/v1` once per list, with every row's `{ sessionId, projectId }`, and the Plugin answers with items keyed by Session id (ADR-0035):

```tsx
import type { Argo } from '@argo/plugin-kit';

export function register(argo: Argo): void {
  argo.slots.register('argo/session/row/v1', async ({ contexts }) => {
    const rows = await Promise.all(
      contexts.map(async ({ sessionId }) => {
        const session = await argo.sessions.get(sessionId);
        const issue = session?.branch?.match(/^issue-(\d+)/)?.[1];

        return [
          sessionId,
          issue ? [{ text: `#${issue}`, action: { path: `/issues/${issue}` } }] : [],
        ];
      }),
    );

    return Object.fromEntries(rows);
  });
}
```

An item is `{ icon?, text, tone?, tooltip?, action? }`: `text` is at most 40 characters, `tone` is a kit tone, and `action.path` opens one of the Plugin's own pages. Anything else fails the Slot's schema.
A Session id left out of the answer has no items. One Plugin sends at most 8 items for one row; more fails the schema.
The row context carries ids only (ADR-0030). Read a Session's `branch` and `projectId` with `argo.sessions.get(sessionId)`, which needs the `{ "kind": "sessions:read" }` Capability and answers `null` for an unknown Session.

Argo keeps each answer per Plugin worker and Session until the Plugin calls `argo.slots.changed('argo/session/row/v1')`, so a Session's status changing asks the Plugin nothing. A restarted Plugin is asked again.
Argo's own items come first, then each Plugin's in Slot order. A phone shows 1 item and a desktop or the web shows 3; the rest come with their Plugin id as overflow for "+N".
A Plugin that throws, answers off-schema, or takes over two seconds is left out alone, and the Server logs it once per Plugin, Slot and reason. Argo does not ask it again, nor wait for it, until it calls `argo.slots.changed` or restarts.

## Session Activity line

A Session row's Activity line is a Single-owner Slot, `argo/session/activity/v1`. It is asked like the row items, with the same `{ sessionId, projectId }` contexts, and a Plugin answers at most one `{ text }` per Session id, of at most 40 characters.
A Plugin can declare it with or without the row items Slot. Every Plugin that declares it answers, but a row shows only the line of the Plugin the user chose under Settings › Plugins › Session rows on that Device. While no Plugin is chosen, the chosen Plugin is turned off on Session rows, or it has no line for a Session, the row shows Argo's own activity.

## Session bar

The Session bar is one line under an open Session's header, `argo/session/bar/v1`. It is asked like the row items, with the same `{ sessionId, projectId }` contexts and an answer keyed by Session id, and a Plugin answers at most one item per Session:

```tsx
argo.slots.register('argo/session/bar/v1', ({ contexts }) =>
  Object.fromEntries(
    contexts.map(({ sessionId }) => [
      sessionId,
      [{ icon: { sf: 'ticket' }, text: '#412 · In review', action: { path: '/issues/412' } }],
    ]),
  ),
);
```

An item is `{ icon?, text, action? }`: `text` is at most 80 characters, and `action.path` opens one of the Plugin's own pages. A tone, a tooltip, a kit tree or a second item fails the Slot's schema, and that Plugin is left out alone.
The bar shows the first Plugin in Slot order that answers, after Argo's own banners, on phones and wide windows alike. The other Plugins' lines wait behind "+N", each named with its Plugin. A user can turn a Plugin off for the bar under Settings › Plugins › Session bar on that Device; the next Plugin in order then takes the line. With no answer, the Session draws no bar.

## Session header actions

A Plugin lists its Session header actions in `plugin.json` under `contributes.declared`, keyed by the Slot `argo/session/header/v1`. Argo draws them from the manifest without starting the Plugin (ADR-0025); pressing one opens the page, which starts it:

```json
"declared": {
  "argo/session/header/v1": [
    {
      "id": "open-issue",
      "label": "Open issue",
      "icon": { "sf": "link", "material": "link" },
      "placement": "header",
      "target": { "type": "page", "path": "/issues" }
    }
  ]
}
```

An action is `{ id, label, icon, placement, target }`: `label` is at most 40 characters, `placement` is `header` or `menu`, and a target is either `{ type: "page", path }`, one of the Plugin's own pages under one of its nav items, or `{ type: "card", cardId }`, a Workbench card the same manifest declares. A Plugin lists at most 4 actions, each id once.
Argo's own actions come first. On a wide window the first `header` action, in Slot order, is an icon before Argo's "…"; every other action goes inside "…" after Argo's entries. A compact or medium window (phones, and narrow web) keeps every Plugin action in "…". Settings › Plugins › Session header turns each Plugin's actions off on that Device.
The page opens for the Session whose header it was pressed in: it reads the Session's id from `context.sessionId`.

```tsx
argo.pages.register('/issues', ({ context }) => <Issues sessionId={context.sessionId} />);
```

A page opened any other way has no `sessionId`.

## Session Workbench card

A Plugin adds one card to a Session's Workbench under the Slot `argo/session/workbench/v1`, again from the manifest alone:

```json
"declared": {
  "argo/session/workbench/v1": [
    {
      "id": "issue",
      "title": "Issue",
      "icon": { "sf": "ticket", "material": "confirmation_number" },
      "page": "/issues/session",
      "tab": "/issues/session/full"
    }
  ]
}
```

A card is `{ id, title, icon, page, tab? }`: `title` is at most 40 characters and names the card, its Inspector tab and its row in a phone's Workbench, and both paths are the Plugin's own. Argo draws the card and owns where it goes: its own cards (Changes, Agents, Shells) come first, then one card per Plugin in Slot order, each in a collapsible glass card the Plugin cannot restyle (ADR-0039). The Plugin draws `page` inside it with any kit components, as on its own pages, and keeps it to a summary — the Workbench shows summaries, not lists.

Give a card a `tab` and pressing its body opens that page in full as an Inspector tab; leave it out and the card stays a card. A phone has no Workbench column, so the card opens as the Inspector's sheet instead.

Both pages open for the Session whose Workbench they are in, so they read `context.sessionId` as a header action's page does. A header action with the target `{ type: "card", cardId }` closes that card when it is open and opens it again when it is not; the manifest is refused if it names a card the Plugin does not declare. Settings › Plugins › Workbench cards turns each Plugin's card off on that Device.

## Background pages and badges

Declare `contributes.background: { path, interval }` in `plugin.json`, and register that path as a page.
Argo activates the Plugin and mounts the page once per registered Project, with `projectId` in its context.
There is no Project-less pass. Each Plugin and Project pair owns an independent timer, with a five-minute minimum interval.
Adding a Project starts its pass. Removing one releases its views, passes, and entries.

Use the same Query in the background page and the mounted Slot to warm the same entry.
A background pass ignores a Query's `every` option. It ends after the first render's Queries settle, or after sixty seconds, and discards its tree.
A refused background Query stops retrying until the Plugin is next opened.
The optional fetch `account` field borrows the Project’s Account for that host.
An unavailable Borrow returns `null` from a direct `argo.fetch` call. A Query reports an error and retains its last successful data.

A page may call `argo.nav.badge(id, count)` to set the nav badge for a nav id its own manifest declares. Zero clears the badge.
A background page runs once per Project, but the badge belongs to the whole Plugin: each pass replaces what the one before it set. Count per Project in your own storage and set the total you want the item to show.
Nav badges are in memory and clear when the Plugin stops or reloads. Background pages cannot raise Notifications.

A drawing throw closes only the failed view. Other pages, Slots, Hooks, and background passes continue.
The failure subscription records one non-fatal drawing failure per Plugin.

## Hooks

The core Hook events are `prompt.submit`, `tool.check`, and `process.spawn` (ADR-0038).
Both `prompt.submit` and `tool.check` carry `sessionId` and `projectId`.
The separate `ui.render` Hook draws Replaceable Slots with its existing payload and answer.
List the Replaceable Slots it draws in `contributes.renders`, which needs `ui.render` in `contributes.hooks`. `contributes.slots` and `argo.slots.register` take only add-only Slots.

Order a Plugin with `contributes.order` in `plugin.json`, an integer that defaults to 0 (ADR-0035).
A Slot's contributors and a Feed row's `ui.render` chain both run first-party Plugins first, then lower `order` first, then by Plugin id; folder names do not change it.
The order is the Plugin's, so it covers all of its Slots and `ui.render` Hooks. The other Hook events keep worker order (ADR-0038).
Declaring `order` without a Slot in `contributes.slots`, `contributes.renders` or `contributes.declared` is a manifest error.
The Server logs, once per Plugin and Slot, each Plugin that changed a row's props, and each Plugin shadowed because a Hook before it answered with a tree:

```text
Plugin <id>: changed <slotId> props
Plugin <id>: <slotId> shadowed by Plugin <id>'s tree
```

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


## Accounts and OAuth

`plugins/examples/github-sign-in` is a complete reference: a sign-in page with the signed-out, in-progress, signed-in, continue-on-the-Server-Device and port-in-use states, PKCE sign-in against GitHub, and the provider handler. Copy it for a new service.

Declare each provided Account as `{ host, page }` in `contributes.accounts`.
Register that page with `argo.pages.register` before registration completes.
The host must be concrete and have an identical `fetch` Capability, including its port. A wildcard Capability does not satisfy this requirement.
Localhost forms are refused.

Register the provider handler when the Plugin starts:

```ts
await argo.accounts.provide(
  'api.github.com',
  { header: 'Authorization', prefix: 'Bearer' },
  (account) => argo.secrets.get(account.id),
);
```

The handler receives the Account metadata and returns a current token or `null`.
Argo wakes the provider when another Plugin borrows its Account.
The whole provider call has a three-second deadline, including activation.
A failed, disabled, stopped, or slow provider makes the borrow return `null`.

After sign-in, create the Account and store its token under the returned id:

```ts
const id = await argo.accounts.add('api.github.com', { label: 'Work' });
await argo.secrets.set(id, token);
```

Argo stores Accounts, Grants, and each Project’s choice in its database.
Tokens stay in the provider’s Keychain namespace, keyed by Account id.
Sign-out deletes the token, Account, Grants, and Project mappings.
Plugin removal also deletes its Accounts and dependent records when discovery succeeds.

`argo.accounts.get(host)` returns the current Project’s Account or `null`.
One available Account becomes the Project’s choice automatically. Multiple Accounts require an explicit choice.
Page effects, Component event handlers, and Hooks carry their Project context across awaited calls.
A call without a Project returns no Account.

Use `argo.fetch(url, { account: host })` to borrow the Account.
A fetch Query uses the same field and the declaring view’s Project.
Argo checks the Grant, calls the provider, and sets its header. The borrower receives no credential value from Argo.
The URL must name the Account’s exact host and port. A redirect away from that host drops the provider header.
Argo removes any borrower header with the same name first. Network-reserved headers cannot provide authentication.
First-party Plugins receive unset Grants silently until consent screens exist. A refused Grant stays refused across Server restarts.

OAuth starts from a page effect or Component event handler on the Server Device.
The Server stamps `context.serverDevice` from the Connection and independently refuses OAuth calls from other Devices.
The App cannot set this flag through its reported platform.

`argo.oauth.start()` returns `redirectUri`, `state`, `codeChallenge`, and `codeChallengeMethod`, or `null` if the listener cannot start.
The method is always `S256`. The redirect URI is `http://127.0.0.1:51789/callback`.
Build the service’s authorize URL with these values, then call `argo.oauth.await(state, authorizeUrl)`.
Argo opens that HTTP or HTTPS URL without a shell.
The result is `{ code, verifier }` or `null`. The Plugin exchanges the code itself.
A denial, unknown state, five-minute timeout, reload, or stop resolves to `null`.
Each Plugin holds one pending exchange. The callback listener runs only while an exchange is pending.

Accounts screens, consent presentation, native sign-out confirmation, and the close-tab document remain pending approved designs in #1166.
The callback currently returns an empty HTTP 204 response. The Server logs a clear error if port 51789 is occupied.
The App URL-scheme guard remains in the App follow-up. The Server already refuses and logs disallowed schemes.
