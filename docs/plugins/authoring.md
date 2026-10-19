# Validate and test a Plugin

From the Argo repository root, run these commands:

```sh
pnpm argo plugin validate plugins/examples/hello
pnpm argo plugin test plugins/examples/hello
```

The Server package also provides the `argo` executable. Its Plugin commands accept an absolute or relative Plugin directory.

## Source validation

`argo plugin validate <dir>` uses the manifest reader and bundler that the Plugin loader uses.
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

```js
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
| `clock.advance(ms)` | Advances Plugin timers and dates. The kit keeps its real rendering scheduler. |
| `settings` | Provides a Map with the manifest defaults. Changes reach `argo.settings.get`. |
| `storage.execute(queries)` | Reads or seeds the isolated Plugin SQLite database through the production storage API. |
| `session` | Provides test Session, Project, and Agent identifiers. |
| `emit(name, event)` | Checks an event and raises it through the production Hook chain. |

`find` matches a label, title, text, text content, or accessible label. It waits up to three seconds.
The chosen surface sets `ctx.surface.platform`; the test App always speaks the current Plugin wire version. The kit does not open an App or draw native pixels.

For a Project details Slot, use the same input that the Server receives:

```js
const view = await mount({
  slot: {
    slotId: 'argo/project/details/v1',
    context: { projectId: session.projectId },
  },
  surface: { platform: 'ios' },
});
```

For a Hook test, use the returned result from the real chain:

```js
const answer = await emit('prompt.submit', {
  sessionId: session.id,
  prompt: [{ type: 'text', text: 'Hello' }],
});
assert.deepEqual(answer, { prompt: [{ type: 'text', text: '[checked] Hello' }] });
```

## Dev reload

While any Turn runs, including a subagent's, the Server keeps the current Plugin worker and defers source rebuild results.
After active Turns end, the Server rebuilds the latest source once. Intermediate syntax errors do not stop the current worker.
Outside a Turn, the existing file watcher reloads the Plugin after each build.
Turning a Plugin off releases its worker and pending rebuild.
