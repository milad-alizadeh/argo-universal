import { JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { messageSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import { expect, it } from 'vitest';
import { processWait } from '../mocks/data-fixture';
import { startHookTest as start } from '../mocks/hook-fixture';

const entered = 'argo.settings.get entered';

it('keeps the ui.render payload and core answer with its full ten-second budget', async () => {
  const kit = await start(
    `export async function register(argo) {
    await argo.on('ui.render', async (ctx, event, next) => { await argo.settings.get('entered'); await new Promise(resolve => setTimeout(resolve, 9999)); return next(); });
  }`,
    ['ui.render'],
  );

  let answer: unknown;

  const emitted = kit
    .emit('ui.render', JsonObject.parse(messageSlotFixture))
    .then((value) => {
      answer = value;
    });

  await expect.poll(() => kit.log(), processWait).toContain(entered);
  await kit.clock.advance(9998);
  expect(answer).toBeUndefined();
  await kit.clock.advance(1);
  await emitted;
  expect(answer).toEqual({ input: messageSlotFixture });
  expect(await kit.log()).not.toContain('ms budget');
});

it('gives up a ui.render Hook at ten seconds and names its event in one fallback log', async () => {
  const kit = await start(
    `export async function register(argo) {
    await argo.on('ui.render', async () => { await argo.settings.get('entered'); return new Promise(() => {}); });
  }`,
    ['ui.render'],
  );

  const emitted = kit.emit('ui.render', JsonObject.parse(messageSlotFixture));

  await expect.poll(() => kit.log(), processWait).toContain(entered);
  await kit.clock.advance(10_000);
  expect(await emitted).toEqual({ input: messageSlotFixture });
  expect(
    (await kit.log())
      .split('\n')
      .filter((line) => line.includes('10000 ms budget')),
  ).toEqual([
    expect.stringContaining(
      'Plugin harness-fixture: core fallback argo/feed/message/v1: ui.render Hook: missed its 10000 ms budget',
    ),
  ]);
});
