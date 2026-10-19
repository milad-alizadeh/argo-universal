import type { PartEvent } from '@repo/contracts/plugins/wire';
import { expect, it, onTestFinished } from 'vitest';
import { z } from 'zod';
import { PluginDispatcher } from './plugin-dispatcher';
import type { PartEventInput } from './plugin-event';

const typed = (payload: string): PartEventInput => ({
  event: 'onChangeText',
  payload,
  schema: z.string().meta({ throttleMs: 150 }),
});

const submit = {
  event: 'onSubmit',
  schema: z.undefined().meta({ flush: true }),
};

type Recording = { delivered: PartEvent[]; events: PluginDispatcher };

function recording(): Recording {
  const delivered: PartEvent[] = [];

  const events = new PluginDispatcher((_key, event) => {
    delivered.push(event);
  });

  onTestFinished(() => events.close());

  return { delivered, events };
}

it('throttles a typed value and retains the latest with its originating delivery', async () => {
  const { delivered, events } = recording();
  const later: PartEvent[] = [];
  void events.send('search', typed('a'));
  void events.send('search', typed('argo'));
  events.setDelivery((_key, event) => {
    later.push(event);
  });
  expect(delivered).toEqual([]);
  await expect
    .poll(() => delivered)
    .toEqual([{ event: 'onChangeText', payload: 'argo' }]);
  expect(later).toEqual([]);
});

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

it('sends a Submit after the queued edit, though another event is still running or refused', async () => {
  const delivered: string[] = [];
  const running = Promise.withResolvers<void>();

  const events = new PluginDispatcher((key, event) => {
    delivered.push(`${key}.${event.event}`);

    if (key === 'save') return running.promise;

    return key === 'name' ? Promise.reject(new Error('Refused')) : undefined;
  });

  onTestFinished(() => events.close());
  void events.send('save', { event: 'onPress', schema: z.undefined() });

  const [edit] = await Promise.allSettled([
    events.send('name', typed('Atlas')),
    events.send('form', submit),
  ]);

  expect(edit.status).toBe('rejected');
  expect(delivered).toEqual([
    'save.onPress',
    'name.onChangeText',
    'form.onSubmit',
  ]);
});

it('sends a queued edit when the view closes', async () => {
  const { delivered, events } = recording();
  const edit = events.send('name', typed('Atlas'));
  events.close();
  await edit;
  expect(delivered).toEqual([{ event: 'onChangeText', payload: 'Atlas' }]);
});
