import type { WireNode } from '@repo/contracts/plugins/wire';
import { emptyPage } from '@repo/contracts/plugins/wire-empty-page';
import { describe, expect, it, vi } from 'vitest';
import { type HeldCardPage, HeldCardStore } from './held-card-store';

const issue = 'tracker/issue';

const notes = 'notes/notes';

const text: WireNode = {
  type: 'Text',
  key: '0',
  props: { children: '#42' },
  children: [],
  slots: {},
};

const held = (root: WireNode | null): HeldCardPage => ({
  root,
  onPageCall: vi.fn<HeldCardPage['onPageCall']>(),
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

    expect(store.page(issue)).toBeUndefined();
    expect(store.filled()).toEqual([]);
    expect(watcher).toHaveBeenCalled();
  });

  it('says a page answered nothing when it drew something and then answers with nothing', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(text));

    expect(store.hold(issue, held(emptyPage()))).toBe(true);
  });

  it('says a page answered nothing on its first answer, as after the Session remounts', () => {
    const store = new HeldCardStore();

    expect(store.hold(issue, held(emptyPage()))).toBe(true);
  });

  it('says nothing answered while a page waits, even one that drew before', () => {
    const store = new HeldCardStore();

    store.hold(notes, held(text));

    expect(store.hold(notes, held(null))).toBe(false);
  });

  it('says nothing answered for a page that draws something', () => {
    const store = new HeldCardStore();

    expect(store.hold(notes, held(text))).toBe(false);
  });

  it('keeps the same filled list while a change inside a card leaves which cards are filled alone', () => {
    const store = new HeldCardStore();

    store.hold(issue, held(text));
    const before = store.filled();

    store.hold(issue, held({ ...text, props: { children: '#43' } }));
    expect(store.filled()).toBe(before);
  });
});
