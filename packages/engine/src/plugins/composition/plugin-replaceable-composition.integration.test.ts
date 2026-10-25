import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import { messageSlotId } from '@repo/contracts/plugins/replaceable';
import {
  messageSlotFixture,
  rewrittenMessage,
  toolCallSlotFixture,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { renderApp } from '#mocks/replaceable-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('keeps the Slot props when no Plugin declares its Replaceable Slot', async () => {
  const home = await createRuntimePlugins([]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  const input = toolCallSlotFixture;

  const messages = [];

  for await (const message of await createCaller({
    signal: controller.signal,
  }).plugins.render(input))
    messages.push(message);

  expect(messages).toEqual([{ type: 'core', input }]);
  controller.abort();
}, 20_000);

it.each([messageSlotFixture, toolCallSlotFixture])(
  'passes through $slotId with a frozen context and this Connection surface',
  async (input) => {
    const home = await createRuntimePlugins([]);
    await writeHookPlugins(home, [
      {
        id: 'pass',
        hooks: ['ui.render'],
        slots: [input.slotId],
        source: `
    export async function register(argo) {
      await argo.on('ui.render', '${input.slotId}', (ctx, e, next) => {
        if (!Object.isFrozen(ctx.props) || !Object.isFrozen(e.props) || ctx.surface.platform !== 'ios') throw new Error('context was not frozen or surface missing');
        return next(e);
      });
    }`,
      },
    ]);
    const { url } = await startEngineTestHost({ home });

    const app = renderApp(url, input, currentPluginSurface('ios'));

    await expect
      .poll(() => app.messages[0], { timeout: 10_000 })
      .toEqual({ type: 'core', input });
    const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');
    expect(log).not.toContain('core fallback');
  },
  20_000,
);

it.each([
  {
    name: 'valid',
    props: rewrittenMessage().props,
    expected: rewrittenMessage(),
  },
  { name: 'invalid', props: { row: 'invalid' }, expected: messageSlotFixture },
])(
  'validates a $name message rewrite',
  async ({ props, expected }) => {
    const home = await createRuntimePlugins([]);
    await writeHookPlugins(home, [
      {
        id: 'rewrite',
        hooks: ['ui.render'],
        slots: [messageSlotId],
        source: `
    export async function register(argo) {
      await argo.on('ui.render', (ctx, e, next) => next({ ...e, props: ${JSON.stringify(props)} }));
    }`,
      },
    ]);
    const { createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());

    const stream = (
      await createCaller({ signal: controller.signal }).plugins.render(
        messageSlotFixture,
      )
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value).toEqual({
      type: 'core',
      input: expected,
    });
  },
  20_000,
);

it('never starts a ui.render Plugin that did not declare the Slot', async () => {
  const home = await createRuntimePlugins([]);
  await writeHookPlugins(home, [
    {
      id: 'undeclared',
      hooks: ['ui.render'],
      source: `export async function register() { throw new Error('must not start'); }`,
    },
  ]);
  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const app = createCaller({ signal: controller.signal });

  const stream = (await app.plugins.render(toolCallSlotFixture))[
    Symbol.asyncIterator
  ]();

  expect((await stream.next()).value).toEqual({
    type: 'core',
    input: toolCallSlotFixture,
  });
  expect((await app.plugins.list()).plugins[0]?.state).toBe('not-started');
}, 20_000);
