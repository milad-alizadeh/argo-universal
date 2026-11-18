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

`plugin.json` stays the manifest. Its `main` names the entry, which can be `.ts` or `.tsx`. Its `icon` gives SF and Material names, which every Plugin needs, and `svg` may add an SVG file of the Plugin's own: the rail and the drawer draw it in one colour, every `fill` and `stroke` taking Argo's tint, and the names stay the fallback for native menus (ADR-0058). `argo plugin validate` refuses a file over 32 KB, a gradient or anything that is not SVG. The entry exports `register`, which receives the Plugin API:

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

## The Plugin realm

Plugin code runs in a bare JavaScript realm, neither Node nor a browser. It has JavaScript's own built-ins (`JSON`, `Math`, `Intl`, `RegExp`, `Map`, typed arrays, `encodeURIComponent` and the rest), `setTimeout`, `clearTimeout` and `argo`. It has no `URL`, `URLSearchParams`, `fetch`, `btoa`, `atob`, `TextEncoder`, `Buffer`, `crypto`, `structuredClone`, `setInterval`, `queueMicrotask`, `AbortController` or `process`; `argo-plugin validate` refuses each one and names what to use instead:

- A request: `argo.fetch`, or a fetch Query.
- A URL: read it with string methods or a RegExp, as `siteHost` in `plugins/jira/atlassian.ts` does, and build one with `encodeURIComponent`.
- Base64 and UTF-8 bytes: by hand from `encodeURIComponent`, as `basicCredential` in `plugins/jira/atlassian.ts` does.
- Work on a clock: a page's `every`, or a Watch.

The Plugin log records calls to `console.log`, `console.info`, `console.warn`, `console.error`, and `console.debug`.
The Server replaces known Secret values and active secret param values with `[secret]`.
Each Plugin has a rate and size limit for console output.
The test kit reads these lines through `await test.log()`.

## Repository gates

A Plugin in this repository is checked like the rest of it: its code, its `mocks/` and its tests go through the repository's oxlint config (`.oxlintrc.json`, which extends `tooling/oxlint/`), and through the comment, test-suffix and test-only-import checks of `pnpm quality:lint`. The caps a first draft breaks most:

| Rule | Cap |
| --- | --- |
| `complexity` | 3 per function |
| `max-lines-per-function` | 15, or 150 in a test |
| `max-lines` | 150 per file, tests included |
| `max-statements` | 10, or 30 in a test |
| `max-params`, `max-depth`, `max-nested-callbacks` | 3 |
| `no-magic-numbers` | outside tests, name each number |
| `anti-slop/no-unknown-parameters`, `typescript/consistent-type-assertions` | no `unknown` parameter and no `as`: narrow with a type guard |

Write small modules from the first draft, one concern to a file, as `plugins/jira` keeps its requests, readers, failures and views apart. Run `node_modules/.bin/oxlint --type-aware plugins/<id>` from the repository root as you go, and `pnpm verify` before you hand back.

## Boards

A `Board` draws columns of cards that a person moves between columns: by drag, or from a card's menu, which offers the same moves for touch and keyboard. The Plugin writes no drag logic. Each `Board.Column` has an `id`, a `title` and an optional `count`, which defaults to the cards it shows. Each `Board.Card` has an `id`, a `title`, an optional `subtitle` and `meta`, and `movesTo`, the ids of the columns it may move to; only those accept its drop, the others fade while it is dragged, and a card without `movesTo` does not move. A card's `onPress` opens it, as a row's does; a card that moves but opens nothing is still a focus stop, whose context-menu key offers its moves.

A move reports the card's `id` and the `column` it lands in, which fill an Operation call:

```tsx
<Board accessibilityLabel="Issues" onMove={to.run('transition', { issue: to.payload('id'), status: to.payload('column') })}>
  {columns.map((column) => (
    <Board.Column key={column.id} id={column.id} title={column.name}>
      {issuesIn(column).map((issue) => (
        <Board.Card key={issue.key} id={issue.key} title={issue.summary} subtitle={issue.key} movesTo={issue.transitions} />
      ))}
    </Board.Column>
  ))}
</Board>
```

The move shows at once: the App sets the card's `column` and `pending` as optimistic props, so it draws in its new column with a spinner until the Operation answers, and goes back with an error toast when it fails. A move to a column the card does not name, or to the one it is in, is refused before any call is made; a page test sees that refusal from `page.act(board, 'onMove', { id, column })`. The board scrolls sideways when its columns do not fit, at every width, and never narrows a column.

## Session rows

A `SessionRow` draws one of the App's own Sessions as its row in the Sessions list, so a page can attach a Session to anything: an Issue, a pull request, a task. It takes the Session's `sessionId` and nothing else about it. The App reads the Session live, so the title, status, the Change stage and other Plugins' items on the row never go stale, and a Plugin stores only the id. Pressing the row opens the Session; `onPress` replaces that.

```tsx
<List appearance="grouped">
  <List.Section key="sessions" title="Sessions">
    {sessionIds.map((id) => (
      <SessionRow key={id} sessionId={id} />
    ))}
  </List.Section>
</List>
```

The Plugin needs the `sessions:read` Capability in `plugin.json`; without it the Server drops the row from the page and logs why. A Session the App does not list, such as an archived or deleted one or a child Session, draws nothing, so a Plugin that wants a "gone" mark checks with `argo.sessions.get`, which answers `null` for one that is gone.

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

An Operation that changes something an Agent should not change on its own sets `"confirmAgent": true`: a Session's run of it asks the person first, as a `confirm` tier Operation does, and a person's own run, such as a tap in the App, applies at once.

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

### Journeys on Vitest

`argo-plugin test` gives each test ten seconds and one Project. A journey that needs a second Project, a fixture service with state of its own, or longer on a loaded machine runs on Vitest instead, as `plugins/jira` and `plugins/issue-tracker` do: the Plugin's `test` script is `vitest run`, with a `vitest.config.ts` beside `plugin.json`, and each test starts the Plugin with `startPluginTest` from `@argo/plugin-kit/testing`:

```ts
const kit = await startPluginTest({ directory, pluginId: 'jira', version: '0.0.0', projects, network, clockStart: 0 });
onTestFinished(() => kit.close());
const page = await kit.pages.open({ path: '/projects/project-1', projectId: 'project-1' });
```

`network` is `fixtureServices(handler).network`, which answers every host the Plugin names; `clockStart` puts the Plugin's timers on `kit.clock`. `plugins/jira/mocks/journey.ts` and `mocks/jira-service.ts` are a worked example. List the test files and `mocks/` in `tsconfig.test.json`, and leave them out of `tsconfig.json`.

A test file runs in Node, where `@argo/plugin-kit` is types only: a test cannot import a module that uses the kit's components, JSX or flows, and Node says so when it tries. Keep what a test shares with Plugin code, such as keys, paths and fixture data, in a module that imports nothing from the kit, and reach the rest through the pages the test opens.

## Test kit

| API | Behavior |
| --- | --- |
| `pages.open({ path, projectId?, sessionId?, pageState?, platform? })` | Draws a page once, as the App on `platform` (web by default) asks for it, and returns its page. A page that cannot draw rejects with why. |
| `page.tree`, `page.pageState`, `page.path` | The tree last drawn, the Page state it was drawn for, and its Page path. |
| `page.find(match)`, `page.findText(text)` | Returns the node a text or a node test matches; `find` throws when none does, and `findText` answers `undefined`. |
| `page.press(match)` | Acts on the node's `onPress` as the App does and returns the page showing after it: a navigation opens the page it names, a Page state change draws the page again, and an Operation runs for the page's Project and Session, then the page draws again. A press that flushes, such as a Button's or an Action's, first lands every edit still waiting for its pause. An Operation that fails rejects the press with why, where the App shows it in an error toast; the test kit has no toast. |
| `page.act(match, event, value?)` | The same for any Component event, with the value a component reports, such as a search's text for `onChangeText` or a move for `onMove`, filled into the event's `to.payload` values. A bound value, or a throttled edit such as a TextField's `onChangeText`, waits for the edits to pause, as in the App: `clock.advance(300)` lands it. |
| `page.loadMore()` | Draws one more page of the page's paged list. After a draw that failed, while the tree kept from before it offers a load more, it asks again for the page that draw lacked, as the App does with the rows it kept. |
| `page.draw()` | Draws the page again, as the App does when an Operation or `argo.changed()` marks it stale. |
| `page.error` | Why the last draw failed, or `undefined`. While it is set, `page.tree` throws it. |
| `fixtureServices(handler)` | Plays the services the Plugin reaches: `handler(request)` answers `{ status?, json?, text?, headers? }`, and `requests` lists what the Plugin asked. Pass its `network` to `startPluginTest`. |
| `pages.draw(input)`, `pages.run(input)`, `pages.stale(signal)` | One draw answer, one Operation run, and the stale marks every App is sent, as the Server answers them. |
| `slotItems(input, { signal, platform })` | Asks an items Slot for one list, as an App does, and yields each merged answer. |
| `clock.advance(ms)` | Advances Plugin timers, dates, Query intervals, background passes, Hook deadlines, and the open pages' edit pauses together. |
| `settings` | Provides a Map with the manifest defaults. Changes reach `argo.settings.get`. |
| `storage.execute(queries)` | Reads or seeds the isolated Plugin SQLite database through the production storage API. |
| `session` | Provides test Session, Project, and Agent identifiers. |
| `sessions` option | What `argo.sessions.get` answers, by Session id; a Session without `idleFor` reads as busy (`null`). |
| `emit(name, event)` | Checks an event and raises it through the production Hook chain. |

A text matches a node's label, title, subtitle, description, text, text content or accessible label, or the supporting text beside it: a caption, footer, error, message, detail or summary.
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
A fetch Query accepts the same fields as `argo.fetch`, including POST requests. A storage Query contains `queries`, each with a read method: `get`, `all`, or `values`. It answers one `{ rows }` for each, and a row is an array of its column values in the `SELECT`'s order, never an object: `all` and `values` answer every row, and `get` answers its one row as `rows` itself, or `[]` when there is none. Read columns by position, as `const [cloudId, host] = row`.

A `fetch` Capability names an exact host, a single-label subdomain pattern, or `*` for any host.
The consent screen shows the declared host or pattern.
Jira declares `*.atlassian.net` for requests to a site such as `team.atlassian.net`.
The pattern matches exactly one DNS label before the suffix and uses the default HTTPS port.
The Server checks the destination addresses on every request and redirect.
Account hosts must be exact.
Other `argo` calls are not Queries. Storage Queries use a read-only connection; writes through another read method are also refused.

`read` answers the Query's data and keeps the last successful value. It throws, failing the draw, only when the Query has no answer yet: a refused call, a transport failure, or Argo's timeout. An HTTP 401 remains fetch data. An unavailable Account Borrow fails the read until it has data.

Without `every`, a Query is read again only when an Operation runs, the Plugin calls `argo.changed()`, or its storage changes. `every` reads Queries older than it again on each tick.
Storage Queries are never polled. A committed Plugin storage write marks them due.

Entries belong to a Plugin and a Project. Equal Queries in that Project share one entry, including Queries from different pages.
Object key order and header name case do not change the entry.

## Named reads

`argo.queries.define(name, read, { projectOf })` makes a named read (ADR-0037): a read the Plugin writes and Argo keeps like a Query, for data that a list and its item's page, or a page and a Slot, share. A Loader reads it with `read(query(args))`; code outside a draw reads it with `argo.queries.read`, or `argo.queries.readState` to have a failure as an answer. `plugins/jira/jira-reads.ts` is a worked example.

- The args are the entry's key, every field of them. `{ ...target, projectKey }` beside `target` is a second entry and a second call to the service, and only a count of the service's requests in a test shows it. Build each read's args in one function, holding only what the read uses.
- `projectOf(args)` names the Project the entry is for. Inside the read, `argo.fetch(url, { account, projectId })` borrows that Project's Account, and `argo.accounts.get(host)` answers it; a named read runs only for a Project, never as the Server Device.
- To draw an item's page at once from its row, the list's read seeds each item's read with what it already holds: `await argo.queries.seed(issue({ projectId, key }), row)`. The page opened from the row finds its entry kept and calls nothing; the same page opened by its address reads. Read the choices its menus offer beside the list the same way; `plugins/jira/issue-reads.ts` seeds each issue from its row. A seed is the Plugin's word for the other read's answer, so ask the service for every field the item's page draws.
- A write, an Operation run or `argo.changed()` makes every entry due. A pull reaches only a paged list's own pages; see Paged lists.

## Pages for a Project

A page opened from the Plugin's nav item has no `context.projectId`. A page that shows one Project's data puts the Project in its path, such as `/projects/:project`, and reads through named reads that name it:

- The Loader takes the Project from `input.params.project` and passes it in each named read's args; `projectOf` hands it to Argo.
- The page lists the Projects to choose from with `argo.projects.list()`, and each row opens `to.go('/projects/<id>')`.
- `argo.accounts.get` and an Account Borrow answer only inside such a read, a Loader of a page drawn for a Project, an Operation run for one, or a Hook.

`plugins/jira/jira-pages.tsx` and `plugins/jira/jira-reads.ts` hold the whole pattern; `plugins/issue-tracker` follows it too.

## Paged lists

A page with many rows gives its definition `list(input, cursor)`, which answers one page as `{ items, cursor }`, with `cursor: null` for the last. The Render reads the pages so far as `input.list` and hands the List `pagination={list.pagination}`. Each page is kept as Argo's own Query of the address and its cursor.

- A pull, the List's `onRefresh` or `to.set({})`, reads the first page fresh. It does not reach a named read: one that `list` or the Loader calls still answers its kept value. A list that must show the service's latest rows on a pull calls the service itself in `list`, page 1 included, and the Loader leaves the rows to it. A refused first page then comes back as an item the Render draws as the List's `empty`, as `plugins/jira/issue-pages.ts` does.
- A later `list` call can return `{ items: [], failed: reason }` or throw. The App keeps the earlier rows and shows “Couldn't load more: <reason>” with **Try again**. The button and the harness method `page.loadMore()` both read the same cursor again.

## Page frames

A page is a `Screen`. Its props say what the page holds, and the App lays it out at every width; a Plugin sets no sizes.

- `width` is `content` (the reading column, the default), `full` or `bleed`. A `bleed` page has no column and no inset: its body fills the page, and a `Canvas` in it fills that body, as a board or a map does.
- `aside` takes one `FieldGroup` of the page's properties, as an Issue's status, labels and assignee, in the rows Settings uses: `FieldGroup.Value` (a `dot` before a status's words), `FieldGroup.Link` and `FieldGroup.Picker`. Values are text, so labels are one value of their names. When the window leaves room beside the column the FieldGroup is a column of its own at the trailing edge; otherwise it sits above the body. Either way it sizes to its rows and scrolls with what holds it. A `FieldGroup.Picker` edits a property: a `multiple` one reports `onToggle` with `{ value, on }` for the one option pressed, since an Operation param cannot hold a list, and `createLabel` with `onCreate` offers to create what the search typed. The aside never moves the title or changes the column's width.
- `footer` stays pinned under the body and rises with the keyboard, as a chat's input does. The footer takes a `TextArea`, a `Stack` or a `Button`. `TextArea` is a multi-line input that grows to six lines and has an optional trailing action, such as a Send `IconButton`. The body does not scroll by itself, so a body longer than the screen goes in a `ScrollView` or a `List`, which then scrolls above the footer.

```tsx
<Screen
  title="#42"
  aside={
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Value title="Status" value="Open" dot="success" />
        <FieldGroup.Value title="Labels" value="bug, sync" />
      </FieldGroup.Section>
    </FieldGroup>
  }
>
  <Detail markdown={body} />
</Screen>
```

`Detail` holds the page's body only; its properties go in the `Screen`'s `aside`. A failed read shows a `Callout` in the body with `tone="danger"` and a Button that tries again, so empty and error read differently. While the page's loader reads for the first time, the App draws the page's Screen with its title and a blank body, and a revisit draws the kept tree at once and asks again behind it, so a page never builds a loading state for its own first read and its render never sees one. `isLoading` draws the body's skeleton, and a `Spinner` marks work with no body to sketch, only for a part the page itself marks pending inside a render, such as a body the loader left unread.

A Screen header draws an `Action` as a button only when it has an icon, and puts the rest in its overflow menu, which suits actions used now and then. A submenu `Action` needs an Argo icon name: a key of `iconSymbols` in `packages/contracts/src/kit-symbols/icon-map.ts`, which type-checking holds the prop to. A press `Action` may take an `{ sf, material }` pair instead. A new name is an Argo change: its entry in that map, its Android drawings as `packages/kit/src/symbols/assets/README.md` says, then `pnpm --filter @repo/kit generate:material-images`.

A page that shows one of several scopes, such as a Jira project on a site, puts the choice in `titleMenu`: Actions and Sections, as `actions` takes. The title then opens them, the shown one checked with `selected`; on the web it stays the page's heading, while iOS and Android read it as the menu's button. A page's view, filters and sort go in `options`, and `optionsBadge` counts the filters in use. The header draws one Options button that opens them, as a sheet on a phone and a popover on a wide window. A switch between views of the page, such as a list and a board, is a `SegmentedControl` at the top of the options, never a bar across the header, with the filters as `FieldGroup.Picker` rows below it (ADR-0062, `plugins/jira/issue-options.tsx`). A phone header then shows the title, Options and Search.

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
The row context carries ids only (ADR-0030). Read a Session's `branch`, `projectId`, `title` and `idleFor` with `argo.sessions.get(sessionId)`, which needs the `{ "kind": "sessions:read" }` Capability and answers `null` for an unknown Session. `idleFor` is how many milliseconds nothing has happened in the Session, and `null` while a Turn runs, a Prompt waits or its queue is paused. `argo.sessions.archive(sessionId)` archives a Session as the App's archive does (the branch is kept, the worktree removed) and needs the `{ "kind": "sessions:archive" }` Capability. It has no confirm tier: the person's earlier choice in the Plugin is the consent (ADR-0055). It is refused for a Session outside the Project the call runs for, while a Turn runs, while the Session's Checkout has uncommitted files, and for a Session that is not top level; the Plugin tries again on a later Watch. The App's own archive does not look at uncommitted files. Turning on the Plugin says it may archive Sessions in its Projects.

`argo.sessions.prompt(sessionId, text)` needs the `{ "kind": "sessions:prompt" }` Capability and sends `text` to a Session of the Project the call runs for, with the Plugin as sender (ADR-0055). It answers `{ status: 'started' }` when an idle Session starts a Turn, or `{ status: 'queued', queuedId }` when the Session is busy or its queue is paused: the Prompt waits behind the queued work and starts when the queue reaches it. `argo.sessions.withdraw(sessionId, queuedId)`, under the same Capability, takes back a queued Prompt the Plugin sent, such as one about a commit a push replaced. It answers `{ withdrawn: true }` when it did, and `{ withdrawn: false }` when the Prompt had started, was gone, or the person is editing it; it is refused for a Prompt the Plugin did not send. A Plugin otherwise only appends: it never resumes, moves or edits the queue, and never deletes anyone else's Prompt. Turning on the Plugin says it may start Turns in its Projects.

Argo keeps each answer per Plugin worker and Session until the Plugin calls `argo.changed()` or one of its Operations runs, so a Session's status changing asks the Plugin nothing. A restarted Plugin is asked again.
Argo's own items come first, then each Plugin's in Slot order. A phone shows 1 item and a desktop or the web shows 3; the rest come with their Plugin id as overflow for "+N".
A Plugin that throws, answers off-schema, or takes over two seconds is left out alone, and the Server logs it once per Plugin, Slot and reason. Argo does not ask it again, nor wait for it, until it calls `argo.changed()`, one of its Operations runs, or it restarts.

## Session Activity line

A Session row's Activity line is a Single-owner Slot, `argo/session/activity/v1`. It is asked like the row items, with the same `{ sessionId, projectId }` contexts, and a Plugin answers at most one `{ text }` per Session id, of at most 40 characters.
A Plugin can declare it with or without the row items Slot. Every Plugin that declares it answers, but a row shows only the line of the Plugin the user chose under Settings › Plugins › Session rows on that Device. While no Plugin is chosen, the chosen Plugin is turned off on Session rows, or it has no line for a Session, the row shows Argo's own activity.

## Session Changes

A Plugin that knows of a Session's pull requests answers `argo/session/changes/v1` (ADR-0052). It is asked like the row items, with `{ sessionId, projectId }` contexts and an answer keyed by Session id. Each item is a Change: `{ id, stage, title, repository?, branch?, base?, head?, pullRequest?: { number, url }, draft?, conflict?, totals?, checks?: { name, state: 'running' | 'passed' | 'failed' }[], stale?: 'signIn' | 'failed' }`. A pull request is identified by `repository` plus `pullRequest.number`, and `id` stays the same for the Change's life. Argo draws the Changes as rows in its Changes card, and a row opens the pull request at `pullRequest.url`; a Plugin sends data, not a card. A provider that throws leaves the Plugin's Changes out and the local Changes stay. Argo asks again every 30 seconds while an App has the Session's Changes open, after making the Plugin's named reads due, so keep the data in named reads and read them with `argo.queries.readState`, which answers `{ data?, error?, stale }`: a read that throws then keeps its last good `data` beside the `error`, and the Change can say `stale` instead of vanishing. Answer each item alone, so one failed item does not drop the others. Absent `checks` means not known and is never drawn as passed.

A Plugin that knows the state of the thing a link points at answers `argo/link/mark/v1` (ADR-0052). It is asked with `{ href, projectId }` contexts, the links a Session page has drawn and the Project they are in, and answers keyed by `href` with at most one item, `{ kind: 'pullRequest' | 'issue', state: 'open' | 'closed' | 'merged' | 'draft' }`. Leave out a link that is not yours. Argo draws the mark and asks again every 30 seconds while the Session is open, so answer from what you have stored and read behind the answer.

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

An item is `{ icon?, text, tone?, action? }`: `text` is at most 80 characters, `tone` is a kit tone the icon and text are drawn in, and `action.path` opens one of the Plugin's own pages. A tooltip, a kit tree or a second item fails the Slot's schema, and that Plugin is left out alone.
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

## Watches

Declare `contributes.watch: { path, interval }` in `plugin.json` and give that path a function with `argo.watch.define` (ADR-0055). Argo runs it once per Project each interval, whether or not an App is open, with a Background pass's budget: a run that goes past 60 seconds is stopped and logged, and the next one still runs. The interval is clamped to one minute or more. A Watch stops when its Plugin is turned off or crashes, and runs again when the Plugin is turned on or starts again.

Unlike a Loader, a Watch may act. Its input has the Project (`context.projectId`), `read(query)` for Queries, and `run(name, params)`, which runs one of the Plugin's own registered Operations for that Project. A Loader's input has no `run`, and Background passes stay read-only.

```ts
argo.watch.define('/', async ({ context: { projectId }, run }) => {
  await run('sync', { reason: 'tick' });
});
```

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

`templates/plugins/github-sign-in` is a complete reference: GitHub's sign-in through the kit's device flow, with its sign-in page drawn by the kit. Copy it for a new service. It uses the device flow GitHub offers, which needs no client secret.

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
A failed, disabled, stopped, or slow provider rejects the borrow with a temporary Account-unavailable error.
Use the page’s existing load-error handling and refresh interval to retry without asking the person to sign in again.
A missing Account, refused Grant, or provider that returns no credential still makes the borrow return `null`.

To offer token paste and OAuth for one Account host, pass both flows to `provideSignIn(argo, [paste, oauth], options)` and `signInGate`.
Declare a required string `flow` param on both Operations.
Make the secret `token` param optional so OAuth can start without it.

Both flows must use the same header name.
Each flow supplies its prefix, such as `Basic` or `Bearer`.
If the Plugin already has Secrets from a single flow, put that flow first.

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

Use `{ action: 'openPluginSettings' }` on a Button, FieldGroup row or header Action to open your Plugin's settings. For example, link there when sign-in needs a client ID or secret.

`oauthFlow(argo, options)` from `@argo/plugin-kit` is the whole sign-in for a service that takes OAuth's authorization code grant with PKCE: from a public client, with no client secret, such as Linear or GitLab, or with a client secret the person supplies, such as Atlassian or Google. Give it the service's URLs:

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
- `authorizeUrl` keeps any query it carries, so a service that wants fields of its own on every authorize URL names them there, as Atlassian's `https://auth.atlassian.com/authorize?audience=api.atlassian.com&prompt=consent`.
- `clientId` is the OAuth app's public client ID, or a function the flow calls when a sign-in starts.
- `clientSecret` is for a service that requires the app's client secret on every code exchange and refresh. Argo ships no secret: declare a `secret` Setting the person fills in, and give a function that reads it with `argo.settings.get`. The flow sends it to `tokenUrl` only, never in the browser, and a sign-in started before it is set fails, saying so. Leave it out for a public client. Changing a Setting marks the Plugin's pages stale, so a sign-in page that offers its button once both values are set draws again; `argo.settings.get` is not a Query, so its Queries and named reads stay as they were. No Action opens a Plugin's settings yet, so the page names the place in words, "Settings › Plugins › Jira" (#2245).
- `label` turns a token into the name of whose Account it opens, such as the login the service answers; `null` fails the sign-in.
- `tokenPath` says where the token sits in the token endpoint's JSON when it is not `access_token`, such as `['authed_user', 'access_token']`.
- `header` is how a borrower's request carries the token, `{ header: 'Authorization', prefix: 'Bearer' }` unless you say otherwise.

`signIn.state()` is `idle`, `waiting`, `signed-in` with the Account's `label`, or `failed` with a `message`, whose `reason` is `port-in-use` when another program holds the callback port. The flow lives in the Plugin's module, so every page and every App sees the one sign-in, and it calls `argo.changed()` each time the state changes, so pages that draw it redraw.

`start()` answers as soon as the browser opens, normally with `waiting`, so the Operation that calls it returns at once. The flow then waits up to five minutes for the person, exchanges the code, adds the Account and keeps its token under the Account's id. `cancel()` ends the wait; a callback from the browser tab still open is ignored. `provide()` registers the provider handler that hands borrowers the kept token.

A token whose answer carried `refresh_token` and `expires_in` is refreshed at `tokenUrl`, with the client secret when there is one, the first time a borrow finds it within a minute of running out. A service that rotates refresh tokens, as Atlassian does, gets each new pair kept before its access token is lent, so a Server that stops mid-refresh wakes holding the token it has not spent. Borrows that find one Account due share one refresh, so a refresh token is never spent twice. A refresh the service refuses, because the refresh token expired or was revoked or the client is no longer accepted, forgets the token and lends nothing. A refusal is a 400 or a 401, or any answer naming `invalid_grant`, `invalid_client` or `unauthorized_client`, as Atlassian's 403 for a spent refresh token does. Then the read finds the person signed out and `signInGate` draws the sign-in until they sign in again. Any other failed refresh lends the kept token.

Declare `signIn` and `cancelSignIn` in `contributes.operations` with tier `act`. Start a sign-in only on the Server Device: the page's Loader reads `context.serverDevice` and offers the button there, and says to continue on the Server Device elsewhere. In the test harness, `kit.pages.draw` and `kit.pages.run` draw and run as a paired Device's App; `serverDevice: true` asks as the App on the Server Device.

A test that signs in through the browser binds Argo's fixed callback port, so call `serialiseOnOAuthPort()` from `@argo/plugin-kit/testing/oauth-port` once at the top of its file; files that do take turns. Give `startPluginTest` an `openBrowser` that plays the browser: it reads the authorize URL's `redirect_uri` and `state` and fetches the redirect with a `code`. `plugins/jira/mocks/atlassian-journey.ts` is a worked example. Await `cancel()` to end the exchange and release the callback port when no other exchange is pending.

### The sign-in pattern

The kit has two flows and one page that draws either, and the token paste below: `deviceFlow` (RFC 8628: the page shows a code, the person enters it on any device, and the Plugin polls) and `oauthFlow` above (redirect with PKCE, on the Server Device). Only `oauthFlow` given a `clientSecret` sends one. A Plugin never writes polling, token storage or a sign-in page, and never holds a token:

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
- The sign-in page is the kit's `SignIn` component, laid out as Settings is: the step beside the service's mark, then Settings rows: a device flow's code is a `FieldGroup.Value` row above the one that copies it and continues. `options.logo` is SVG markup of the service's logo for the mark, such as `{ name: 'GitHub', logo: githubLogoSvg }`; without it, the App draws the Plugin's own `icon`. A Plugin can also place `SignIn` on its own pages, with `FieldGroup.Link` and `FieldGroup.Value` rows as its children.
- The sign-in page draws every step: asking for a code, the code with where to enter it and a countdown length, denied, expired and failed, and the redirect flow's wait for the browser. A redirect flow on a Device that is not the Server Device says to continue there; a device flow does not need it, and `argo.accounts.add` is not refused to a paired Device.
- A read for a Project the page's path names, rather than the page's own, passes `projectId` to `argo.fetch`.

### The token paste

`tokenPaste(argo, options)` is the sign-in for a service that takes a personal API token the person makes there, such as a Jira or Linear token. The kit draws the field, checks the token, adds the Account, keeps the token as a Secret and provides it; the Plugin names three things:

```tsx
import { provideSignIn, signInGate, tokenPaste, type Argo } from '@argo/plugin-kit';

const flow = tokenPaste(argo, {
  host: 'api.linear.app',
  header: { header: 'Authorization', prefix: '' },
  label: (token) => linearLogin(argo, token),
});

await provideSignIn(argo, flow, { name: 'Linear' });
argo.pages.define('/', signInGate(flow, { name: 'Linear' }, { load, render }));
```

- `host` is the Account's API host. Declare it in `contributes.accounts` and as a `fetch` Capability.
- `header` is how a borrower's request carries the kept token.
- `label(token, fields)` checks a pasted token: call the service with it, as `argo.fetch(url, { headers })`, and answer whose Account it opens, or `null` when the service refuses it. When the Plugin knows why, such as a token made without the scopes it needs, it answers `{ refused: message }`, and the page draws that message beside the field in place of the kit's "wasn't accepted"; a message that holds the token is not drawn. The token also goes to `credential` if you supply it.
- Declare `signIn` in `contributes.operations`, tier `act`, with one param `token`: `{ "type": "string", "description": "The pasted API token.", "required": true, "secret": true }`. The sign-in page's `FieldGroup.SecretField` sends what is pasted to it, so the token is never logged, answered or kept in Page state (ADR-0051). A token paste needs no `cancelSignIn`.
- A refused token is shown beside the field, which stays for the next paste. A token is pasted on any Device, a paired phone included. Signing in again with a token for the same label rewrites that Account's token, so a revoked token's gate takes a new one.
- `flow.state()` is `idle`, `signed-in` with the Account's `label`, or `failed` with the `message` drawn beside the field. A `label` that throws shows a fixed message, never its error, which may name the token.
- The field sends its text each time typing pauses for 150 ms, and each send is checked with `label`; a paste is one send. A token typed by hand is therefore checked at every pause, and "wasn't accepted" can show while the person is still typing; the field keeps their text. Text shorter than 8 characters is never sent to `label`, and an emptied field clears the error. The token is trimmed of surrounding spaces before it is checked.
- A newer send replaces one still being checked or kept: the older one keeps no token, and adds no Account unless it was already being added.

For a service that needs an email or site, declare extra fields in `fields`, such as `{ key: 'email', title: 'Email' }`.
Declare a string Operation param for each field.
The kit holds these values in Page state and passes them to `label(token, fields)`.

Use `credential: ({ token, email }) => …` to build the credential the Account keeps.
For Basic auth, encode `email:token` as Base64 and use a `Basic` header prefix.
The token arrives through the secret Operation param.

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
Call `argo.oauth.cancel(state)` to end the pending exchange and resolve its wait to `null`.
Each Plugin holds one pending exchange. The callback listener runs only while an exchange is pending.

Accounts screens, consent presentation, native sign-out confirmation, and the close-tab document remain pending approved designs in #1166.
The callback currently returns an empty HTTP 204 response. The Server logs a clear error if port 51789 is occupied.
The App URL-scheme guard remains in the App follow-up. The Server already refuses and logs disallowed schemes.
