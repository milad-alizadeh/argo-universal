# Write, validate and test a Plugin

An Agent asked to build a Plugin starts from the Operations `plugin.guide`, which answers the blueprint and a component reference read from the kit's schemas, and `plugin.new`, which writes a working Plugin into the Session's Checkout. This page is the API they point to. `pnpm check` in a Plugin's folder runs every check on that Plugin alone: its Operation types, `tsc`, validation and its harness tests.

A Plugin is a TypeScript project. Its `package.json` depends on `@argo/plugin-kit` alone, which provides the components, the `Argo` type of the Plugin API, the test kit and the `argo-plugin` command. Plugins in this repository take the kit from the workspace:

```json
{
  "name": "@argo/my-plugin",
  "private": true,
  "type": "module",
  "scripts": {
    "check-types": "argo-plugin types . --check && tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
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
  argo.pages.define('/', { load: () => 'Hello', render: (text) => <Text>{text}</Text> });
}
```

A page is a Loader page (ADR-0050): `load` reads what the page shows, and `render` turns it into a tree, with no hooks, effects or function props. A Component event holds a value made by `to`, the Render's second argument: `to.go(path)` opens a page, `to.set(change)` changes the Page state and draws the page again, `to.bind(key)` puts a search's text or a selection into a Page state key, and `to.run(operation, args)` runs one of the Plugin's Operations. `state` gives the Page state's defaults; the Render reads it as `input.state`, and a pattern's `:params` as `input.params`:

```tsx
argo.pages.define('/counter', {
  state: { taps: 0 },
  load: () => null,
  render: (_data, to, { state }) => (
    <Button label={`Tapped ${state.taps} times`} onPress={to.set({ taps: state.taps + 1 })} />
  ),
});
```

Some Component events report a payload: a Table's `onSortChange` reports the column and direction, and a List's `onMove` reports the moved row's `id`, the `section` it lands in and its `index` there. `to.payload(field)` stands for one field of it, or `to.payload()` for the whole payload, such as a Switch's value, anywhere `to.set` or `to.run` takes a value. The App fills it in when the event fires and acts at once, with no draw in between. Page state holds scalars and selections only, so an object payload goes into flat keys:

```tsx
<Table
  columns={columns}
  sort={{ column: state.sortColumn, direction: state.sortDirection }}
  onSortChange={to.set({ sortColumn: to.payload('column'), sortDirection: to.payload('direction') })}
>
  {rows}
</Table>

<List layout="lanes" onMove={to.run('moveCard', { card: to.payload('id'), lane: to.payload('section'), index: to.payload('index') })}>
  {lanes}
</List>
```

A field the payload lacks, as a move's `section` for rows outside any Section, leaves its key out. A value that does not fit where it lands, such as a whole object into Page state, fails the event. The types check the Operation's name and its fixed params, not a payload field's name; core checks the filled-in arguments against the manifest's params, as it does for any run. The List holds a moved row where it was dropped until the page draws a new order or the Operation answers, whichever comes first, and puts it back if the Operation fails.

A page is opened by the path it is defined at. A `navigate` Action carries that same path, as `onPress={{ action: 'navigate', path: '/builds/web' }}`, and the App finds the route; a Plugin never writes the App's `/plugins/<Plugin id>/<nav id>` prefix. The page opens under the nav item the App is showing when its path sits below that item's `path`, and otherwise under the Plugin's nav item whose `path` holds it. A path no nav item holds is not available.

Run the commands from the Plugin folder:

```sh
pnpm validate
pnpm test
```

`argo-plugin <validate|types|test> <dir>` accepts an absolute or relative Plugin directory. The CLI's `argo plugin <validate|types|test> <dir>` runs the same command.

## Source validation

`argo-plugin validate <dir>` uses the manifest reader and bundler that the Plugin loader uses.
It reports Hook registrations, `argo` calls, and Slot registrations from the entry and its imports.
For a Plugin that hooks `ui.render`, it also reports the declared order, as `order: ui.render <n>`.
Diagnostics include the file, line, column, and refusal reason. A refused Plugin produces a non-zero exit code.

The command checks source without starting the Plugin or running its machine calls.
Source inspection reports literal Hook and Slot names. Computed registrations need tests that exercise those registrations.
For literal visual props in JSX, validation uses the Server checks and reports the node and refusal reason.
These checks cover `Svg` markup, `Chart` series, and `Canvas` scenes from amended ADR-0028.
`CodeMap` is unsupported; use `Canvas`. Computed visual data needs a page test: a draw drops a refused node and logs why.
Chart and Canvas rendering remains part of the visual kit components work (#959).

## Operations

A Plugin tells every Session's Agent when its Operations apply with Plugin instructions: `contributes.instructions` names a Markdown file beside `plugin.json`, up to 1,000 characters, which `argo plugin validate` checks. Argo's MCP server sends it once per Session under the Plugin's name.

A Plugin's own Operations are declared in `contributes.operations` (ADR-0044). Each names its params, and a string param may list its `choices`. `caller` says what the Operation needs of whoever runs it: `"session"` runs it only for a Session (a person's tap on a page is not one, though it carries the page's Project and Session as scope), and `"project"` gives it a Project, the `projectId` the run names or else the caller's own. Core checks all of this before the handler runs.

```json
{
  "name": "setStatus",
  "label": "Set Issue status",
  "description": "Close or reopen one Issue in a Project.",
  "tier": "act",
  "params": {
    "number": { "type": "number", "description": "The Issue number.", "required": true },
    "status": { "type": "string", "description": "open or closed.", "required": true, "choices": ["open", "closed"] }
  },
  "caller": ["project"]
}
```

`argo-plugin types .` writes `plugin.gen.d.ts` beside `plugin.json`; run it again after changing the Operations, and commit it. The handler then gets typed params and caller, and `to.run` in a Render or a `ui.render` Hook is checked against the manifest, so a misspelt name, a missing param or a value outside `choices` fails `check-types`:

```ts
argo.operations.register('setStatus', async ({ number, status }, { projectId }) => {
  // status is 'open' | 'closed', and projectId is always a string here.
});

to.run('setStatus', { number, status: 'closed' });
```

### Secret params

A value a person types into a `FieldGroup.SecretField`, such as a pasted API token, reaches the Plugin only as an Operation param marked `"secret": true` (ADR-0051). Only a string param is secret, and it lists no `choices`.

```json
"params": {
  "token": { "type": "string", "description": "The API token.", "required": true, "secret": true }
}
```

```tsx
<FieldGroup.SecretField title="API token" value="" onChangeText={to.run('saveToken', { token: to.payload() })} />
```

- The Server refuses, and leaves out of the drawn page, a SecretField whose text goes to Page state (`to.bind` or `to.set`), into `optimistic` props, or to a param not marked secret. The log line names the fix.
- While the Operation runs, the Server writes `[secret]` in place of the value in the Plugin log, in a Session's history of the run, and in what the run answers: its result, its error, and so `argo` CLI output. `argo operations` lists the param as `writeOnly`.
- The App forgets the typed text once the run has answered and the field is let go.
- Keep the value with `argo.secrets`; never put it in storage, Page state or a tree.

`argo-plugin types . --check` and `argo-plugin validate` fail while the file is not the manifest's. A Plugin's `tsconfig.test.json` that sets its own `include` lists `plugin.gen.d.ts` too.

## Plugin tests

Put tests in files named `*.test.js`, `*.test.mjs`, or `*.test.ts` inside the Plugin directory.
The command discovers these files recursively and skips `node_modules`.
Import `test` from `@argo/plugin-kit/testing`:

```ts
import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

test('a press changes the page', async ({ pages }) => {
  const page = await pages.open({ path: '/' });

  await page.press('Increment');
  assert.equal(page.find('Count: 1').type, 'Text');
});
```

Each test receives a fresh Plugin host and temporary storage. The command closes the host and removes the storage after each test.
A failed assertion, empty test file, missing test file, or test timeout produces a non-zero exit code.
Each test has a ten-second time limit.

The test host uses the production loader, worker, Hook chain, wire preparation, and page checks.
Tests run local Plugin code and use its declared Capabilities. Executable fixtures remain necessary for tests that run external commands.

## Test kit

| API | Behavior |
| --- | --- |
| `pages.open({ path, projectId?, sessionId?, pageState?, platform? })` | Draws a page once, as the App on `platform` (web by default) asks for it, and returns its page. A page that cannot draw rejects with why. |
| `page.tree`, `page.pageState`, `page.path` | The tree last drawn, the Page state it was drawn for, and its Page path. |
| `page.find(match)` | Returns the node a text or a node test matches, or throws. |
| `page.press(match)` | Acts on the node's `onPress` as the App does and returns the page showing after it: a navigation opens the page it names, a Page state change draws the page again, and an Operation runs for the page's Project and Session, then the page draws again. A press that flushes, such as a Button's or an Action's, first lands every edit still waiting for its pause. An Operation that fails rejects the press with why. |
| `page.act(match, event, value?)` | The same for any Component event, with the value a component reports, such as a search's text for `onChangeText` or a move for `onMove`, filled into the event's `to.payload` values. A bound value, or a throttled edit such as a TextField's `onChangeText`, waits for the edits to pause, as in the App: `clock.advance(300)` lands it. |
| `page.loadMore()` | Draws one more page of the page's paged list. |
| `page.draw()` | Draws the page again, as the App does when an Operation or `argo.changed()` marks it stale. |
| `pages.draw(input)`, `pages.run(input)`, `pages.stale(signal)` | One draw answer, one Operation run, and the stale marks every App is sent, as the Server answers them. |
| `slotItems(input, { signal, platform })` | Asks an items Slot for one list, as an App does, and yields each merged answer. |
| `clock.advance(ms)` | Advances Plugin timers, dates, Query intervals, background passes, Hook deadlines, and the open pages' edit pauses together. |
| `settings` | Provides a Map with the manifest defaults. Changes reach `argo.settings.get`. |
| `storage.execute(queries)` | Reads or seeds the isolated Plugin SQLite database through the production storage API. |
| `session` | Provides test Session, Project, and Agent identifiers. |
| `sessions` option | What `argo.sessions.get` answers, by Session id. |
| `emit(name, event)` | Checks an event and raises it through the production Hook chain. |

`find` matches a label, title, text, text content, or accessible label.
While an Operation runs, `page.tree` shows its `optimistic` props, as the App does; the page drawn after it answers replaces them, and a failure puts the tree back.
The chosen platform sets `ctx.surface.platform`; the test App always speaks the current Plugin wire version. The kit does not open an App or draw native pixels.

A Workbench card or a Session header action opens a page for a Session; open it with that `sessionId`, as the App does. For an items Slot, such as Project details, ask with the same input the Server receives:

```ts
const items = slotItems(
  { slotId: 'argo/project/details/v1', contexts: [{ projectId: session.projectId }] },
  { signal, platform: 'ios' },
);
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

A Loader reads through a Query with `read(query)`. Argo runs the Query, shares its answer, and keeps it for the Page address the draw is for.

```tsx
import { Label, type Argo } from '@argo/plugin-kit';

const forgeList = { api: 'process', action: 'run', argv: ['forge', 'list', '--json'] } as const;

export function register(argo: Argo): void {
  argo.pages.define('/forge', {
    every: 30_000,
    load: ({ read }) => read(forgeList),
    render: (list) => <Label text={list.stdout} />,
  });
}
```

Declare the command's Capability in `plugin.json`. A process Query uses the Project folder of the page it is read for unless the Query specifies `cwd`. A direct `argo.process.run` call does not select the Project folder. Use a Query for commands that belong in that folder.
A fetch Query accepts the same fields as `argo.fetch`, including POST requests. A storage Query contains `queries`, each with a read method: `get`, `all`, or `values`.
Other `argo` calls are not Queries. Storage Queries use a read-only connection; writes through another read method are also refused.

`read` answers the Query's data and keeps the last successful value. It throws, failing the draw, only when the Query has no answer yet: a refused call, a transport failure, or Argo's timeout. An HTTP 401 remains fetch data. An unavailable Account Borrow fails the read until it has data.

Without `every`, a Query is read again only when an Operation runs, the Plugin calls `argo.changed()`, or its storage changes. `every` reads Queries older than it again on each tick.
Storage Queries are never polled. A committed Plugin storage write marks them due.

Entries belong to a Plugin and a Project. Equal Queries in that Project share one entry, including Queries from different pages.
Object key order and header name case do not change the entry.

## Page frames

A page is a `Screen`. Its props say what the page holds, and the App lays it out at every width; a Plugin sets no sizes.

- `width` is `content` (the reading column, the default), `full` or `bleed`. A `bleed` page has no column and no inset: its body fills the page, and a `Canvas` in it fills that body, as a board or a map does.
- `aside` takes one `Metadata` of the page's properties, as an Issue's status, labels and assignee. When the window leaves room beside the column it is a column of its own at the trailing edge; otherwise it is a row of Pills under the title, and below medium those Pills show their icon alone. The aside never moves the title or changes the column's width.
- `footer` stays pinned under the body and rises with the keyboard, as a chat's input does. The footer takes a `TextArea`, a `Stack` or a `Button`. `TextArea` is a multi-line input that grows to six lines and has an optional trailing action, such as a Send `IconButton`. The body does not scroll by itself, so a body longer than the screen goes in a `ScrollView` or a `List`, which then scrolls above the footer.

```tsx
<Screen
  title="#42"
  aside={
    <Metadata>
      <Metadata.StatusDot title="Status" text="Open" tone="success" />
    </Metadata>
  }
>
  <Detail markdown={body} />
</Screen>
```

`Detail` holds the page's body only; its properties go in the `Screen`'s `aside`. A failed read shows a `Callout` in the body with `tone="danger"` and a Button that tries again, so empty and error read differently. While the page's loader reads for the first time, the App draws the page's Screen with its title and a blank body, and a revisit draws the kept tree at once and asks again behind it, so a page never builds a loading state for its own first read and its render never sees one. `isLoading` draws the body's skeleton, and a `Spinner` marks work with no body to sketch, only for a part the page itself marks pending inside a render, such as a body the loader left unread.

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

Argo keeps each answer per Plugin worker and Session until the Plugin calls `argo.changed()` or one of its Operations runs, so a Session's status changing asks the Plugin nothing. A restarted Plugin is asked again.
Argo's own items come first, then each Plugin's in Slot order. A phone shows 1 item and a desktop or the web shows 3; the rest come with their Plugin id as overflow for "+N".
A Plugin that throws, answers off-schema, or takes over two seconds is left out alone, and the Server logs it once per Plugin, Slot and reason. Argo does not ask it again, nor wait for it, until it calls `argo.changed()`, one of its Operations runs, or it restarts.

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
argo.pages.define('/issues', {
  load: () => null,
  render: (_data, _to, { context }) => <Issues sessionId={context.sessionId} />,
});
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

A card is `{ id, title, icon, page, tab? }`: `title` is at most 40 characters and names the card, its Inspector tab and its row in a phone's Workbench, and both paths are the Plugin's own. Argo draws the card and owns where it goes: its own cards (Changes, Agents, Shells) come first, then one card per Plugin in Slot order, each in a collapsible glass card the Plugin cannot restyle (ADR-0039). Both paths are Loader pages, defined with `argo.pages.define(path, { load, render })` (ADR-0050). The Plugin draws `page` inside it with any kit components, as on its own pages, and keeps it to a summary — the Workbench shows summaries, not lists.

Give a card a `tab` and pressing its body opens that page in full as an Inspector tab; leave it out and the card stays a card. A phone has no Workbench column, so the card opens as the Inspector's sheet instead.

Both pages are drawn for the Session whose Workbench they are in, so their `load` reads `context.sessionId` and `context.projectId`.

A card with nothing to show is not drawn. Return `null` from the card page's `render` when there is nothing, as Argo's own cards do: the page answers the empty root, and Argo draws no card, no Inspector tab, no row in a phone's Workbench and no header action that targets the card. Argo draws the page when a Session opens and shows no card, nor a frame for one, until the first answer; a card seen before draws from its kept answer. Attaching something while the Session is open brings the card in, and removing it takes the card away, and an open tab of it closes, without a reload. Return `null` for "no Session", "still loading" and "nothing attached", and keep drawing for a failure, so the person sees the card say so instead of reading its absence as "nothing". A tree you draw, even an empty `Stack`, draws a card.

Three things follow from how Argo asks. Every declared card's page is drawn for each open Session, whether or not the card is shown, so a card page with `every`, or a live one, keeps running while the Session is mounted: keep a card page cheap. A Render draws nothing when it returns `null`, `[]` or a Fragment of nothing; anything else, even an empty `Stack`, draws a card. And a tree the Server could not draw, such as a Render that throws or a refused component, also answers the empty root, so a broken card disappears like an empty one. The Server logs why. An App older than this rule still draws an empty root as nothing, as it always did for a failed tree, but it has no card logic and still draws the card's frame.
 A header action with the target `{ type: "card", cardId }` closes that card when it is open and opens it again when it is not; the manifest is refused if it names a card the Plugin does not declare. Settings › Plugins › Workbench cards turns each Plugin's card off on that Device.

## Pages on a clock and live pages

A Loader page redraws when a stale mark names it (ADR-0050). Give it `every` (ms) to also redraw on a clock while it is on screen; the Server clamps it to at least ten seconds and logs once when it does. On each tick the page's Queries older than `every` are read again, so a tick with nothing new draws nothing.

```tsx
argo.pages.define('/status', {
  every: 60_000,
  load: async ({ read }) => read(statusQuery),
  render: (status) => <Text>{status.summary}</Text>,
});
```

A Live page's `load` is an async generator: each value it yields is drawn while the page is on screen, at most once a frame, and Argo sends only the rows that changed. Leaving the page, or the Plugin stopping or reloading, ends the generator; its `finally` runs once the `await` it is in settles. Stale marks and `every` do not draw a Live page again, so wait for your own changes inside it. A Live page cannot have a `list`, and a one-off draw of it shows its first value.

```tsx
const lines: string[] = [];
let wake = () => {};

argo.pages.define('/log', {
  async *load() {
    for (;;) {
      yield [...lines];
      await new Promise<void>((resolve) => (wake = resolve));
    }
  },
  render: (shown) => (
    <List>
      {shown.map((line, index) => (
        <ListItem key={String(index)} title={line} />
      ))}
    </List>
  ),
});
```

An Operation that appends a line then calls `wake()`. In tests, `kit.pages.live({ path }, signal)` follows a Live page and answers its trees and patches until the signal aborts; `packages/plugin-kit/testing/loader-live-fixture.ts` is a worked example.

## Background pages and badges

Declare `contributes.background: { path, interval }` in `plugin.json`, and define that path as a Loader page with `argo.pages.define`.
On each interval Argo activates the Plugin and runs that page's `load` alone, once per registered Project, with `projectId` in its context. Nothing renders and no tree is kept.
There is no Project-less pass. Each Plugin and Project pair owns an independent timer, with a five-minute minimum interval.
Adding a Project starts its pass. Removing one releases its pages, passes, and entries.

A pass ends when `load` settles, or after sixty seconds. A `load` that throws fails that pass only; the next interval runs it again.
The optional fetch `account` field borrows the Project’s Account for that host.
An unavailable Borrow returns `null` from a direct `argo.fetch` call. A Query reports an error and retains its last successful data.

A page may call `argo.nav.badge(id, count)` to set the nav badge for a nav id its own manifest declares. Zero clears the badge.
A background `load` runs once per Project, but the badge belongs to the whole Plugin: each pass replaces what the one before it set. Count per Project in your own storage and set the total you want the item to show.
Nav badges are in memory and clear when the Plugin stops or reloads. Background pages cannot raise Notifications.

A drawing throw closes only the failed page. Other pages, Slots, Hooks, and background passes continue.
The failure subscription records one non-fatal drawing failure per Plugin.

## Hooks

The core Hook events are `prompt.submit`, `tool.check`, and `process.spawn` (ADR-0038).
Both `prompt.submit` and `tool.check` carry `sessionId` and `projectId`.
The separate `ui.render` Hook draws Replaceable Slots with its existing payload. It returns a tree from a pure render, with no state or effects, or calls `next` to leave the row to the Plugins after it and core. `ctx.to.go(path)` and `ctx.to.run(operation, args)` give a Component event its value. Argo checks the tree as it checks a page's and answers the App once; a tree that throws, is refused, or needs a newer App leaves core to draw the row, logged once. New props ask the chain again.
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

`plugins/examples/github-sign-in` is a complete reference: GitHub's sign-in through the kit's device flow, with its sign-in page drawn by the kit. Copy it for a new service. GitHub's web flow needs a client secret, which the kit's flows do not send, so the example uses the device flow GitHub offers instead.

Declare each provided Account as `{ host, page }` in `contributes.accounts`.
Define that page with `argo.pages.define` before registration completes; an Account's page is a Loader page.
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
Tokens stay in the provider’s namespace of the OS secret store, keyed by Account id.
Each Plugin's Secrets live in the OS's own secret store, under that Plugin's namespace only (ADR-0051).
When no store answers, as on a headless Linux Server without a Secret Service, `argo.secrets.set` rejects with a message naming what to install, and `argo.secrets.get` answers `null`.
A manifest that declares `security`, `secret-tool`, `cmdkey` or a PowerShell credential cmdlet as a process command is refused at validation.
Sign-out deletes the token, Account, Grants, and Project mappings.
Plugin removal also deletes its Accounts and dependent records when discovery succeeds.

`argo.accounts.get(host)` returns the current Project’s Account or `null`.
One available Account becomes the Project’s choice automatically. Multiple Accounts require an explicit choice.
Loaders, paged lists, named reads, Operation runs, and Hooks carry their Project context across awaited calls.
A named read runs for its Query's Project only, never as the Server Device, because Argo keeps its answer for every App.
A call without a Project returns no Account, such as one made while the Plugin registers or from an items Slot provider.

Use `argo.fetch(url, { account: host })` to borrow the Account.
A fetch Query uses the same field and the Project its page is drawn for.
A direct `argo.fetch` call may also name a registered Project with `projectId`, which decides the Account it borrows; a page whose path names a Project reads this way from a named read. An unregistered Project is refused.
Argo checks the Grant, calls the provider, and sets its header. The borrower receives no credential value from Argo.
The URL must name the Account’s exact host and port. A redirect away from that host drops the provider header.
Argo removes any borrower header with the same name first. Network-reserved headers cannot provide authentication.
First-party Plugins receive unset Grants silently until consent screens exist. A refused Grant stays refused across Server restarts.

### The OAuth flow

`oauthFlow(argo, options)` from `@argo/plugin-kit` is the whole sign-in for a service that takes OAuth's authorization code grant with PKCE from a public client, with no client secret, such as Linear or GitLab. GitHub's web flow needs its client secret even with PKCE, so GitHub uses `deviceFlow`. Give it the service's URLs:

```tsx
import { oauthFlow } from '@argo/plugin-kit';

const signIn = oauthFlow(argo, {
  host: 'api.linear.app',
  authorizeUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  clientId: async () => {
    const id = await argo.settings.get('client-id');

    return typeof id === 'string' ? id : null;
  },
  scopes: ['read'],
  label: (token) => linearLogin(argo, token),
});

argo.operations.register('signIn', () => signIn.start());
argo.operations.register('cancelSignIn', () => signIn.cancel());
argo.pages.define('/sign-in', {
  load: () => ({ flow: signIn.state() }),
  // Draw data.flow, with Buttons whose onPress is to.run('signIn', {}) and to.run('cancelSignIn', {}).
  render: (data, to) => <SignIn flow={data.flow} to={to} />,
});
await signIn.provide();
```

- `host` is the Account's API host. Declare it in `contributes.accounts` and as a `fetch` Capability; `tokenUrl`'s host needs a `fetch` Capability too.
- `clientId` is the OAuth app's public client ID, or a function the flow calls when a sign-in starts.
- `label` turns a token into the name of whose Account it opens, such as the login the service answers; `null` fails the sign-in.
- `tokenPath` says where the token sits in the token endpoint's JSON when it is not `access_token`, such as `['authed_user', 'access_token']`.
- `header` is how a borrower's request carries the token, `{ header: 'Authorization', prefix: 'Bearer' }` unless you say otherwise.

`signIn.state()` is `idle`, `waiting`, `signed-in` with the Account's `label`, or `failed` with a `message`, whose `reason` is `port-in-use` when another program holds the callback port. The flow lives in the Plugin's module, so every page and every App sees the one sign-in, and it calls `argo.changed()` each time the state changes, so pages that draw it redraw.

`start()` answers as soon as the browser opens, normally with `waiting`, so the Operation that calls it returns at once. The flow then waits up to five minutes for the person, exchanges the code, adds the Account and keeps its token under the Account's id. `cancel()` ends the wait; a callback from the browser tab still open is ignored. `provide()` registers the provider handler that hands borrowers the kept token.

Declare `signIn` and `cancelSignIn` in `contributes.operations` with tier `act`. Start a sign-in only on the Server Device: the page's Loader reads `context.serverDevice` and offers the button there, and says to continue on the Server Device elsewhere. In the test harness, `kit.pages.draw` and `kit.pages.run` draw and run as a paired Device's App; `serverDevice: true` asks as the App on the Server Device.

### The sign-in pattern

The kit has two flows and one page that draws either: `deviceFlow` (RFC 8628: the page shows a code, the person enters it on any device, and the Plugin polls) and `oauthFlow` above (redirect with PKCE, on the Server Device). Neither sends a client secret. A Plugin never writes polling, token storage or a sign-in page, and never holds a token:

```tsx
import { deviceFlow, provideSignIn, signInGate, SignInRequired, type Argo } from '@argo/plugin-kit';

const flow = deviceFlow(argo, {
  host: 'api.github.com',
  name: 'GitHub',
  clientId: 'Ov23livvjnJww4D3CYGd',
  deviceUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  label: { url: 'https://api.github.com/user', field: 'login' },
});

await provideSignIn(argo, flow, { name: 'GitHub' });
argo.pages.define('/', signInGate(flow, { name: 'GitHub' }, { load, render }));
```

- `provideSignIn` registers the `signIn` and `cancelSignIn` Operations (declare both in `contributes.operations`, tier `act`), defines the sign-in page at `/sign-in` (the page `contributes.accounts` names) and registers the Account's provider.
- `signInGate(flow, options, page)` takes an ordinary Loader page whose `load` answers once. When a read finds no Account, or the service rejects the Account's token (a 401), `load` throws `SignInRequired`, and the gate draws the sign-in in the page's place. Signing in again rewrites the same Account's token. The page reads again every minute unless it says `every`, so a sign-out or a revoked token is noticed within it, and a sign-in redraws it at once.
- `deviceFlow`'s `label` names the person: the kit calls `url` with the token and reads `field`, so the Plugin never sees the token. A person who signs in again with the same label keeps one Account.
- The sign-in page draws every step: asking for a code, the code with where to enter it and a countdown length, denied, expired and failed, and the redirect flow's wait for the browser. A redirect flow on a Device that is not the Server Device says to continue there; a device flow does not need it, and `argo.accounts.add` is not refused to a paired Device.
- A read for a Project the page's path names, rather than the page's own, passes `projectId` to `argo.fetch`.

### `argo.oauth`

The OAuth flow is built on these calls, which a Plugin can use itself for a service the flow does not fit.

OAuth runs only for the Server Device: from an Operation run or a draw the Server Device asked for.
The Server stamps `context.serverDevice` from the asking Connection and independently refuses OAuth calls for other Devices.
The App cannot set this flag through its reported platform.
An exchange the Plugin started on the Server Device may be awaited after the run that started it has answered, from any later call of the same worker.

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
