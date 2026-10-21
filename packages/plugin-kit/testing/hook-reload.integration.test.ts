import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startPluginTest, type PluginTest } from '@argo/plugin-kit/testing';
import { expect, it, onTestFinished } from 'vitest';
import { processWait } from '../mocks/data-fixture';
import { hookFixture, pluginId, promptEvent } from '../mocks/hook-fixture';

const promptSubmit = 'prompt.submit';

// Each scenario boots the original worker and its replacement before advancing the Hook clock.
const reloadLimitMs = 15_000;

async function reloaded(elapsed: number, delay: number): Promise<PluginTest> {
  const directory = await hookFixture(`export async function register(argo) {
    await argo.on('prompt.submit', (ctx, event, next) => next());
  }`);

  const kit = await startPluginTest({
    directory,
    pluginId,
    version: '0.0.0',
    clockStart: 0,
  });

  onTestFinished(() => kit.close());
  await kit.emit(promptSubmit, promptEvent);
  await kit.clock.advance(elapsed);
  await writeFile(
    join(directory, 'index.tsx'),
    `export async function register(argo) {
    await argo.on('prompt.submit', async () => {
      await argo.settings.get('reloaded');
      await new Promise(resolve => setTimeout(resolve, ${delay}));
      return { drop: 'Late answer' };
    });
  }`,
  );
  await expect
    .poll(
      async () => (await kit.log()).split('argo.on prompt.submit').length,
      processWait,
    )
    .toBe(3);

  return kit;
}

it(
  'keeps a reloaded worker on the advanced runtime clock',
  async () => {
    const kit = await reloaded(3000, 500);
    let answer: unknown;

    const emitted = kit.emit(promptSubmit, promptEvent).then((value) => {
      answer = value;
    });

    await expect.poll(() => kit.log()).toContain('argo.settings.get reloaded');
    await kit.clock.advance(499);
    expect(answer).toBeUndefined();
    await kit.clock.advance(1);
    await emitted;
    expect(answer).toEqual({ drop: 'Late answer' });
    expect(await kit.log()).not.toContain('ms budget');
  },
  reloadLimitMs,
);

it(
  'keeps the prompt deadline after reloading an advanced worker',
  async () => {
    const kit = await reloaded(1000, 2500);
    let answer: unknown;

    const emitted = kit.emit(promptSubmit, promptEvent).then((value) => {
      answer = value;
    });

    await expect.poll(() => kit.log()).toContain('argo.settings.get reloaded');
    await kit.clock.advance(1999);
    expect(answer).toBeUndefined();
    await kit.clock.advance(1);
    await emitted;
    expect(answer).toEqual({ prompt: promptEvent.prompt });
    await kit.clock.advance(500);
    expect(
      (await kit.log())
        .split('\n')
        .filter((line) => line.includes('2000 ms budget')),
    ).toHaveLength(1);
  },
  reloadLimitMs,
);
