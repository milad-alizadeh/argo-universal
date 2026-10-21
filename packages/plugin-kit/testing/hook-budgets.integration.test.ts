import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startPluginTest } from '@argo/plugin-kit/testing';
import { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { expect, it, onTestFinished } from 'vitest';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { processWait } from '../mocks/data-fixture';
import {
  startHookTest as start,
  hookFixture as fixture,
  pluginId,
  promptEvent,
} from '../mocks/hook-fixture';

const entered = 'argo.settings.get entered';

it('gives up a prompt Hook at 2000 ms and logs the Plugin and event once', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', async () => { await argo.settings.get('entered'); return new Promise(() => {}); });
  }`);

  let answer: unknown;

  const emitted = kit.emit('prompt.submit', promptEvent).then((value) => {
    answer = value;
  });

  await expect.poll(() => kit.log(), processWait).toContain(entered);
  await kit.clock.advance(1999);
  expect(answer).toBeUndefined();
  await kit.clock.advance(1);
  await expect.poll(() => answer).toEqual({ prompt: promptEvent.prompt });
  await emitted;
  expect(
    (await kit.log())
      .split('\n')
      .filter((line) => line.includes('skipped prompt.submit')),
  ).toEqual([
    expect.stringContaining(
      'Plugin harness-fixture: skipped prompt.submit Hook: missed its 2000 ms budget',
    ),
  ]);
});

it('counts a stalled argo.fetch against the prompt Hook wall-clock budget', async () => {
  const requested = Promise.withResolvers<void>();

  const port = await httpsServer(() => {
    requested.resolve();
  });

  const directory = await fixture(`export async function register(argo) {
    await argo.on('prompt.submit', async () => { await argo.fetch('https://localhost:${port}/stalled'); return { drop: 'Too late' }; });
  }`);

  const manifest = JSON.parse(
    await readFile(join(directory, 'plugin.json'), 'utf8'),
  );

  await writeFile(
    join(directory, 'plugin.json'),
    JSON.stringify({
      ...manifest,
      capabilities: [
        { kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' },
      ],
    }),
  );

  const kit = await startPluginTest({
    directory,
    pluginId,
    version: '0.0.0',
    clockStart: 0,
    network: await fixtureNetwork(),
  });

  onTestFinished(() => kit.close());
  let answer: unknown;

  const emitted = kit.emit('prompt.submit', promptEvent).then((value) => {
    answer = value;
  });

  await requested.promise;
  await kit.clock.advance(1999);
  expect(answer).toBeUndefined();
  await kit.clock.advance(1);
  await emitted;
  expect(answer).toEqual({ prompt: promptEvent.prompt });
});

it.each([
  {
    name: 'tool.check' as const,
    event: {
      sessionId: 'test-session',
      projectId: 'test-project',
      request: {
        requestId: 'permission',
        toolCallId: 'tool',
        title: 'Edit',
        options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
      },
    },
    expected: { decision: 'ask' },
  },
  {
    name: 'process.spawn' as const,
    event: { pluginId: 'another-plugin', argv: ['echo', 'hello'] },
    expected: { argv: ['echo', 'hello'] },
  },
])(
  'gives $name its full ten-second budget',
  async ({ name, event, expected }) => {
    const kit = await start(
      `export async function register(argo) {
    await argo.on('${name}', async () => { await argo.settings.get('entered'); return new Promise(() => {}); });
  }`,
      [name],
    );

    let answer: unknown;

    const emitted = kit.emit(name, JsonObject.parse(event)).then((value) => {
      answer = value;
    });

    await expect.poll(() => kit.log(), processWait).toContain(entered);
    await kit.clock.advance(9999);
    expect(answer).toBeUndefined();
    await kit.clock.advance(1);
    await emitted;
    expect(answer).toEqual(expected);
    expect(
      (await kit.log())
        .split('\n')
        .filter((line) => line.includes('10000 ms budget')),
    ).toEqual([
      expect.stringContaining(
        `Plugin harness-fixture: skipped ${name} Hook: missed its 10000 ms budget`,
      ),
    ]);
  },
);
