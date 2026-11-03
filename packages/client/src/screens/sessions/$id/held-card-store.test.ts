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
  it('counts no card as filled while one waits and another draws nothing', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(null));
    store.hold(notes, held(emptyPage()));

    expect(store.filled()).toEqual([]);
  });

  it('counts a card as filled once its page draws something', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(null));
    store.hold(issue, held(text));

    expect(store.filled()).toEqual([issue]);
  });

  it('stops counting a card as filled once its page empties', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(text));
    store.hold(issue, held(emptyPage()));

    expect(store.filled()).toEqual([]);
  });

  it('forgets a released card and tells its watchers', () => {
    const store = new HeldCardStore();
    const watcher = vi.fn<() => void>();

    store.hold(issue, held(text));
    store.subscribe(watcher);
    store.release(issue);

    expect(store.view(issue)).toBeUndefined();
    expect(store.filled()).toEqual([]);
    expect(watcher).toHaveBeenCalled();
  });

  it('says which card emptied when its page drew something and then answers with nothing', () => {
    const store = new HeldCardStore();
    const emptied = vi.fn<(key: string) => void>();

    store.whenEmptied(emptied);
    store.hold(issue, held(text));
    store.hold(issue, held(emptyPage()));

    expect(emptied.mock.calls).toEqual([[issue]]);
  });

  it('says nothing emptied when a page answers with nothing before it ever drew', () => {
    const store = new HeldCardStore();
    const emptied = vi.fn<(key: string) => void>();

    store.whenEmptied(emptied);
    store.hold(issue, held(null));
    store.hold(issue, held(emptyPage()));

    expect(emptied).not.toHaveBeenCalled();
  });

  it('says nothing emptied while a card that drew waits for its next view', () => {
    const store = new HeldCardStore();
    const emptied = vi.fn<(key: string) => void>();

    store.hold(notes, held(text));
    store.whenEmptied(emptied);
    store.hold(notes, held(null));

    expect(emptied).not.toHaveBeenCalled();
  });

  it('says nothing emptied when a card that drew is released', () => {
    const store = new HeldCardStore();
    const emptied = vi.fn<(key: string) => void>();

    store.hold(notes, held(text));
    store.whenEmptied(emptied);
    store.release(notes);

    expect(emptied).not.toHaveBeenCalled();
  });

  it('keeps the same filled list while a change inside a card leaves which cards are filled alone', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(text));
    const before = store.filled();

    store.hold(issue, held({ ...text, props: { children: '#43' } }));
    expect(store.filled()).toBe(before);
  });
});
