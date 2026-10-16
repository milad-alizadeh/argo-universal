import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it.each([
  { fixture: 'crashing', message: 'Fixture Plugin crashed' },
  { fixture: 'empty-error', message: '' },
])(
  'publishes a named $fixture Plugin failure and retains its identity on reconnect',
  async ({ fixture, message }) => {
    const home = await createRuntimePlugins([{ id: 'bad', fixture }]);
    const { caller, createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    const watching = createCaller({ signal: controller.signal });

    const failures = (await watching.plugins.failures())[
      Symbol.asyncIterator
    ]();

    expect((await failures.next()).value).toEqual([]);
    const changed = failures.next();

    await caller.plugins.activate({ pluginId: 'bad' });
    const failure = (await changed).value;
    expect(failure).toEqual([
      {
        pluginId: 'bad',
        name: 'Fixture hello',
        message,
        key: expect.any(String),
      },
    ]);

    const reconnect = (await watching.plugins.failures())[
      Symbol.asyncIterator
    ]();

    expect((await reconnect.next()).value).toEqual(failure);
    controller.abort();
    expect(await failures.next()).toMatchObject({ done: true });
    expect(await reconnect.next()).toMatchObject({ done: true });
  },
  15_000,
);

it('clears a recovered dev Plugin failure and gives a repeated crash a new identity', async () => {
  const home = await createRuntimePlugins([
    { id: 'dev', fixture: 'dev', dev: true },
  ]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const watching = createCaller({ signal: controller.signal });
  const failures = (await watching.plugins.failures())[Symbol.asyncIterator]();
  await failures.next();

  await caller.plugins.activate({ pluginId: 'dev' });
  const initial = (await failures.next()).value;
  const source = join(home, 'plugins/dev/check.ts');

  await writeFile(source, 'export function check(): void {}');
  expect((await failures.next()).value).toEqual([]);
  await expect
    .poll(() => caller.plugins.list(), { timeout: 5000 })
    .toMatchObject({ plugins: [{ state: 'running' }] });
  await writeFile(
    source,
    'export function check(): void { throw Error("Initial dev Plugin"); }',
  );
  const repeated = (await failures.next()).value;
  expect(repeated).toMatchObject([{ message: 'Initial dev Plugin' }]);
  expect(repeated).not.toEqual(initial);
  controller.abort();
  expect(await failures.next()).toMatchObject({ done: true });
}, 15_000);
