import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { PluginDispatcher } from './plugin-dispatcher';

it.each(['onSearchTextChange', 'onChangeText'] as const)(
  'throttles %s and retains the latest typed value with its originating delivery',
  async (event) => {
    const delivered: PluginInteraction[] = [];
    const later: PluginInteraction[] = [];

    const events = new PluginDispatcher((_key, interaction) => {
      delivered.push(interaction);
    });

    onTestFinished(() => events.close());
    void events.send('search', {
      event,
      payload: 'a',
      schema: z.string().meta({ throttleMs: 150 }),
    });
    void events.send('search', {
      event,
      payload: 'argo',
      schema: z.string().meta({ throttleMs: 150 }),
    });
    events.setDelivery((_key, interaction) => {
      later.push(interaction);
    });
    expect(delivered).toEqual([]);
    await expect.poll(() => delivered).toEqual([{ event, payload: 'argo' }]);
    expect(later).toEqual([]);
  },
);

it('returns the selection acknowledgement to its caller', async () => {
  const acknowledgement = Promise.withResolvers<void>();
  const events = new PluginDispatcher(() => acknowledgement.promise);
  onTestFinished(() => events.close());

  const pending = events.send('list', {
    event: 'onSelectionChange',
    payload: ['984'],
    schema: z.array(z.string()),
  });

  expect(pending).toBe(acknowledgement.promise);
  acknowledgement.resolve();
  await pending;
});
