import type { ComponentEvent, WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it, vi } from 'vitest';
import type { PluginOnEvent } from '../../lib/product/plugin-registry';
import { HeldEvents } from './held-events';

const row = (key: string, title: string): WireNode => ({
  type: 'ListItem',
  key,
  props: { title, onPress: { event: 'onPress' } },
  children: [],
  slots: {},
});

const page = (...rows: WireNode[]): WireNode => ({
  type: 'List',
  key: 'page',
  props: {},
  children: rows,
  slots: {},
});

const press: ComponentEvent = { event: 'onPress' };

const firstRow = 'page/one';

const oldTree = page(row('one', 'Close #101'), row('two', 'Close #102'));

describe('a tap on a kept tree', () => {
  it('waits for the live view and reaches it', async () => {
    const held = new HeldEvents();
    const live = vi.fn<PluginOnEvent>(() => Promise.resolve());
    const tap = held.hold(oldTree, firstRow, press);

    expect(live).not.toHaveBeenCalled();

    held.release(oldTree, live);

    await expect(tap).resolves.toBeUndefined();
    expect(live).toHaveBeenCalledExactlyOnceWith(firstRow, press);
  });

  it('never runs the handler of a node the live view changed', async () => {
    const held = new HeldEvents();
    const live = vi.fn<PluginOnEvent>(() => Promise.resolve());
    const tap = held.hold(oldTree, firstRow, press);

    // The same key now closes another Issue, as a Plugin that keys rows by place draws it.
    held.release(page(row('one', 'Close #105')), live);

    await expect(tap).rejects.toThrow('changed');
    expect(live).not.toHaveBeenCalled();
  });

  it('never runs a handler for a node the live view no longer has', async () => {
    const held = new HeldEvents();
    const live = vi.fn<PluginOnEvent>(() => Promise.resolve());
    const tap = held.hold(oldTree, firstRow, press);

    held.release(page(row('two', 'Close #102')), live);

    await expect(tap).rejects.toThrow('changed');
    expect(live).not.toHaveBeenCalled();
  });

  it('is dropped quietly when the page goes first, and never runs later', async () => {
    const held = new HeldEvents();
    const live = vi.fn<PluginOnEvent>(() => Promise.resolve());
    const tap = held.hold(oldTree, firstRow, press);

    held.drop();
    held.release(oldTree, live);

    await expect(tap).resolves.toBeUndefined();
    expect(live).not.toHaveBeenCalled();
  });

  it('keeps taps in the order they were made, and sends each once', async () => {
    const held = new HeldEvents();
    const sent: string[] = [];

    const live = (key: string): Promise<void> => {
      sent.push(key);

      return Promise.resolve();
    };

    const taps = [
      held.hold(oldTree, firstRow, press),
      held.hold(oldTree, 'page/two', press),
    ];

    held.release(oldTree, live);
    held.release(oldTree, live);

    await Promise.all(taps);
    expect(sent).toEqual([firstRow, 'page/two']);
  });

  it('reports a live view that refuses it', async () => {
    const held = new HeldEvents();
    const tap = held.hold(oldTree, firstRow, press);

    held.release(oldTree, () => Promise.reject(new Error('refused')));

    await expect(tap).rejects.toThrow('refused');
  });
});
