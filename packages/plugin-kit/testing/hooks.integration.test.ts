import { startPluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import {
  startHookTest as start,
  hookFixture as fixture,
  pluginId,
  promptEvent,
} from '../mocks/hook-fixture';

it.each(['session.start', 'turn.complete'])(
  'refuses a manifest naming withdrawn event %s',
  async (name) => {
    const directory = await fixture('export function register() {}', [name]);
    await expect(
      startPluginTest({ directory, pluginId, version: '0.0.0' }),
    ).rejects.toThrow(name);
  },
);

it.each([
  "'prompt.submit', () => ({ drop: 'No' }), { guard: true }",
  "'prompt.submit', undefined, () => ({ drop: 'No' }), { guard: true }",
])('refuses removed Hook options naming the option: %s', async (args) => {
  const kit =
    await start(`import { Text } from '@argo/plugin-kit'; export async function register(argo) {
    await argo.on(${args}); argo.pages.register('/', () => <Text>Ready</Text>);
  }`);

  await expect(
    kit.mount({ page: '/', surface: { platform: 'web' } }),
  ).rejects.toThrow('guard');
});

it('passes the Project to prompt.submit Hooks', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', (ctx, event) => ({ prompt: [{ type: 'text', text: event.projectId }] }));
  }`);

  expect(await kit.emit('prompt.submit', promptEvent)).toEqual({
    prompt: [{ type: 'text', text: 'test-project' }],
  });
});

it('a Plugin that registers a refusing Hook and then fails to start refuses nothing', async () => {
  const kit = await start(`export async function register(argo) {
    await argo.on('prompt.submit', () => ({ drop: 'Must not run' }));
    throw new Error('Startup failed');
  }`);

  expect(await kit.emit('prompt.submit', promptEvent)).toEqual({
    prompt: promptEvent.prompt,
  });
  expect(await kit.log()).toContain('Startup failed');
});
