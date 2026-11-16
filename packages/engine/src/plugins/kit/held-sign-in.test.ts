import { describe, expect, it, vi, type Mock } from 'vitest';
import { heldSignIn, type HeldSignIn } from './held-sign-in';

type State = 'idle' | 'one' | 'two';

type Flow = { changed: Mock<() => void>; held: HeldSignIn<State> };

const flow = (): Flow => {
  const changed = vi.fn<() => void>();

  return { changed, held: heldSignIn<State>({ changed }, 'idle') };
};

describe('heldSignIn', () => {
  it('holds idle until an attempt settles', () => {
    expect(flow().held.state()).toBe('idle');
  });

  it('records each effective settle and says so once', () => {
    const { changed, held } = flow();
    const attempt = held.begin();

    expect(attempt.settle('one')).toBe('one');
    expect(held.state()).toBe('one');
    expect(changed).toHaveBeenCalledTimes(1);

    attempt.settle('two');

    expect(held.state()).toBe('two');
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale attempt after a replacing begin, answering the held state', () => {
    const { changed, held } = flow();
    const stale = held.begin();
    const fresh = held.begin();

    fresh.settle('one');
    changed.mockClear();

    expect(stale.live()).toBe(false);
    expect(stale.settle('two')).toBe('one');
    expect(held.state()).toBe('one');
    expect(changed).not.toHaveBeenCalled();
  });

  it('ignores a settle after cancel', () => {
    const { changed, held } = flow();
    const attempt = held.begin();

    attempt.settle('one');
    held.cancel();
    changed.mockClear();

    expect(attempt.settle('two')).toBe('idle');
    expect(held.state()).toBe('idle');
    expect(changed).not.toHaveBeenCalled();
  });

  it('cancels to idle, says so, and makes the attempt stale', () => {
    const { changed, held } = flow();
    const attempt = held.begin();

    attempt.settle('one');
    changed.mockClear();

    expect(held.cancel()).toBe('idle');
    expect(held.state()).toBe('idle');
    expect(attempt.live()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(1);
  });
});
