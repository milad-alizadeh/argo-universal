import { DesktopShare } from '@repo/contracts/desktop-share';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readShareRequest } from './share-request';

afterEach(() => vi.restoreAllMocks());

describe('a share request from the renderer', () => {
  it('is read unchanged when it is recognised', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    const request = {
      title: 'A page',
      message: 'Worth a look',
      url: 'https://example.com/page',
    };

    expect(readShareRequest(DesktopShare.safeParse(request))).toEqual(request);
    expect(diagnostic).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing message', { title: 'A page' }, 'expected string'],
    ['an unknown field', { message: 'Hi', extra: true }, 'Unrecognized key'],
    ['a non-web URL', { message: 'Hi', url: 'file:///etc/passwd' }, 'Invalid'],
    ['a non-object', 'not a request', 'expected object'],
  ])('is rejected and reported with %s', (_name, input, reason) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => readShareRequest(DesktopShare.safeParse(input))).toThrow(
      reason,
    );
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenCalledWith(
      expect.stringMatching(/^desktop: unrecognised share request #\d+$/),
      expect.any(Array),
    );
  });
});
