import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { CipherState } from './cipher-state';

const nothing = Buffer.alloc(0);

it('opens what the other direction sealed, record by record', () => {
  const key = randomBytes(32);
  const sender = new CipherState(key);
  const receiver = new CipherState(key);

  for (const text of ['one', 'two', 'three'])
    expect(
      receiver
        .open(nothing, sender.seal(nothing, Buffer.from(text)))
        .toString(),
    ).toBe(text);
});

it('stops at its ceiling with an error of its own, before any record number repeats', () => {
  const state = new CipherState(randomBytes(32), 2n);

  state.seal(nothing, Buffer.from('a'));
  state.seal(nothing, Buffer.from('b'));

  expect(() => state.seal(nothing, Buffer.from('c'))).toThrow(
    'every record number',
  );
  expect(() => state.open(nothing, randomBytes(32))).toThrow(
    'every record number',
  );
});
