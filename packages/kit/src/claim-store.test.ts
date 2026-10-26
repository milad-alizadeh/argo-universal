import { describe, expect, it } from 'vitest';
import { createClaimStore } from './claim-store';

describe('a place where the newest claim wins', () => {
  it('shows the value of the claim that holds it', () => {
    const store = createClaimStore<string>();

    store.claim().show('band');

    expect(store.current()).toBe('band');
  });

  it('gives the place to a newer claim and does not hand it back when that one lets go', () => {
    const store = createClaimStore<string>();
    const first = store.claim();
    const second = store.claim();
    first.show('first');
    second.show('second');

    second.release();

    expect(store.isHeld()).toBe(false);
    expect(store.current()).toBeUndefined();
  });

  it('ignores a claim that no longer holds the place', () => {
    const store = createClaimStore<string>();
    const first = store.claim();
    const second = store.claim();
    second.show('second');

    first.show('first');
    first.release();

    expect(store.current()).toBe('second');
  });

  it('tells subscribers when a claim starts, shows and ends', () => {
    const store = createClaimStore<string>();
    const seen: (string | undefined)[] = [];
    store.subscribe(() => seen.push(store.current()));

    const claim = store.claim();
    claim.show('a');
    claim.release();

    expect(seen).toEqual([undefined, 'a', undefined]);
  });
});

const selecting = (holding: string | undefined, next: string): boolean =>
  next === 'selecting' && holding !== 'selecting';

describe('a place where claims queue and some outrank the holder', () => {
  it('keeps the first claim and makes the others wait', () => {
    const store = createClaimStore(selecting);
    const first = store.claim();
    const second = store.claim();
    first.show('first');
    second.show('second');

    expect(store.current()).toBe('first');
  });

  it('gives the place to a waiting claim whose value outranks the holder', () => {
    const store = createClaimStore(selecting);
    const first = store.claim();
    const second = store.claim();
    first.show('first');

    second.show('selecting');

    expect(store.current()).toBe('selecting');
  });

  it('hands the place on in order when the holder lets go, with the displaced holder waiting', () => {
    const store = createClaimStore(selecting);
    const first = store.claim();
    const second = store.claim();
    const third = store.claim();
    first.show('first');
    second.show('second');
    third.show('selecting');

    third.release();
    expect(store.current()).toBe('first');

    first.release();
    expect(store.current()).toBe('second');
  });

  it('drops a waiting claim that lets go', () => {
    const store = createClaimStore(selecting);
    const first = store.claim();
    const second = store.claim();
    first.show('first');
    second.show('second');

    second.release();
    first.release();

    expect(store.isHeld()).toBe(false);
  });
});
