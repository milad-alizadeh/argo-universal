import { expect, it, onTestFinished, vi } from 'vitest';
import { z } from 'zod';
import {
  PluginDispatcher,
  type PartEventInput,
  type ReportFailure,
} from './plugin-dispatcher';

const refused = new Error('Refused');

const press: PartEventInput = { event: 'onPress', schema: z.undefined() };

const awaited: PartEventInput = {
  event: 'onLoadMore',
  schema: z.undefined().meta({ awaits: true }),
};

const typed = (payload: string): PartEventInput => ({
  event: 'onChangeText',
  payload,
  schema: z.string().meta({ throttleMs: 20 }),
});

type Recording = {
  events: PluginDispatcher;
  report: ReturnType<typeof vi.fn<ReportFailure>>;
};

function dispatcher(fails: boolean): Recording {
  const report = vi.fn<ReportFailure>();

  const events = new PluginDispatcher(
    () => (fails ? Promise.reject(refused) : Promise.resolve()),
    report,
  );

  onTestFinished(() => events.close());

  return { events, report };
}

it('reports a failed press once and still rejects to its caller', async () => {
  const { events, report } = dispatcher(true);
  await expect(events.send('row', press)).rejects.toBe(refused);
  await vi.waitFor(() =>
    expect(report).toHaveBeenCalledExactlyOnceWith(refused),
  );
});

it('leaves a failed awaited event to the part that awaits it', async () => {
  const { events, report } = dispatcher(true);
  await expect(events.send('list', awaited)).rejects.toBe(refused);
  await Promise.resolve();
  expect(report).not.toHaveBeenCalled();
});

it('reports a failed delivery once for every edit it coalesced', async () => {
  const { events, report } = dispatcher(true);

  const edits = ['a', 'ar', 'arg'].map(async (text) =>
    events.send('search', typed(text)),
  );

  await expect(Promise.all(edits)).rejects.toBe(refused);
  await vi.waitFor(() =>
    expect(report).toHaveBeenCalledExactlyOnceWith(refused),
  );
});

it('reports nothing for a delivery that succeeds', async () => {
  const { events, report } = dispatcher(false);
  await events.send('row', press);
  expect(report).not.toHaveBeenCalled();
});
