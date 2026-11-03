import type { WireNode } from '@repo/contracts/plugins/wire';
import { emptyPage } from '@repo/contracts/plugins/wire-empty-page';
import { describe, expect, it, vi } from 'vitest';
import { type HeldCardView, HeldCardStore } from './held-card-store';

const issue = 'tracker/issue';

const notes = 'notes/notes';

const text: WireNode = {
  type: 'Text',
  key: '0',
  props: { children: '#42' },
  children: [],
  slots: {},
};

const held = (root: WireNode | null): HeldCardView => ({
  root,
  treeKey: 0,
  dispatch: vi.fn<HeldCardView['dispatch']>(),
});

describe('HeldCardStore', () => {
  it('counts a card as filled only once its page draws something, and not after it empties', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(null));
    store.hold(notes, held(emptyPage()));
    expect(store.filled()).toEqual([]);

    store.hold(issue, held(text));
    expect(store.filled()).toEqual([issue]);

    store.hold(issue, held(emptyPage()));
    expect(store.filled()).toEqual([]);
  });

  it('forgets a released card and tells its watchers', () => {
    const store = new HeldCardStore();
    const watcher = vi.fn<() => void>();

    store.subscribe(watcher);
    store.hold(issue, held(text));
    store.release(issue);

    expect(store.view(issue)).toBeUndefined();
    expect(store.filled()).toEqual([]);
    expect(watcher).toHaveBeenCalledTimes(2);
  });

  it('says which card emptied when its page answers with nothing, not while it waits or when it is released', () => {
    const store = new HeldCardStore();
    const emptied = vi.fn<(key: string) => void>();

    store.whenEmptied(emptied);
    store.hold(issue, held(null));
    store.hold(issue, held(emptyPage()));
    store.hold(notes, held(text));
    store.hold(notes, held(null));
    store.hold(notes, held(text));
    store.release(notes);
    store.hold(issue, held(text));
    store.hold(issue, held(emptyPage()));

    expect(emptied.mock.calls).toEqual([[issue]]);
  });

  it('keeps the same filled list while a change inside a card leaves which cards are filled alone', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(text));
    const before = store.filled();

    store.hold(issue, held({ ...text, props: { children: '#43' } }));
    expect(store.filled()).toBe(before);
  });
});
