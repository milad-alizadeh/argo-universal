import { describe, expect, it } from 'vitest';
import { toServerDetails } from './to-server-details';

const data = {
  version: '1.2.3',
  startedAt: '2026-10-03T09:00:00.000Z',
  pid: 4242,
};

const withName = { ...data, name: 'Mac' };

describe('toServerDetails', () => {
  it('is loading until the Server answers', () => {
    expect(
      toServerDetails({ isPending: true, isError: false, error: null }),
    ).toEqual({ status: 'loading' });
  });

  it('carries the error message when the Server info fails', () => {
    expect(
      toServerDetails({
        isPending: false,
        isError: true,
        error: { message: 'Server is down' },
      }),
    ).toEqual({ status: 'error', message: 'Server is down' });
  });

  it('is loaded with the latest clock tick and only the shown fields', () => {
    expect(
      toServerDetails(
        {
          isPending: false,
          isError: false,
          error: null,
          data: withName,
        },
        '2026-10-03T10:00:01.000Z',
      ),
    ).toEqual({ status: 'loaded', ...data, clock: '2026-10-03T10:00:01.000Z' });
  });

  it('is loaded without a clock before the first tick', () => {
    expect(
      toServerDetails({ isPending: false, isError: false, error: null, data }),
    ).toEqual({ status: 'loaded', ...data, clock: undefined });
  });
});
