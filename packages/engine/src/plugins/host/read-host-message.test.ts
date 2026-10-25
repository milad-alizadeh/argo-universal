import { afterEach, expect, it, vi } from 'vitest';
import { HostMessage } from '../protocol/runtime';
import { readHostMessage } from './read-host-message';

afterEach(() => vi.restoreAllMocks());

it('reads a message the Plugin host protocol recognises without reporting it', () => {
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

  expect(readHostMessage(HostMessage.safeParse({ type: 'ready' }))).toEqual({
    type: 'ready',
  });
  expect(diagnostic).not.toHaveBeenCalled();
});

it.each([
  ['an unknown type', { type: 'unknown' }],
  ['no type', {}],
  ['a non-object', 'ready'],
])(
  'reports and counts a message with %s, and reads nothing',
  (_name, value) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(readHostMessage(HostMessage.safeParse(value))).toBeUndefined();
    expect(readHostMessage(HostMessage.safeParse(value))).toBeUndefined();
    expect(diagnostic).toHaveBeenCalledTimes(2);
    expect(diagnostic).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Plugin host: unrecognised message #\d+$/),
      expect.any(Array),
    );
  },
);
