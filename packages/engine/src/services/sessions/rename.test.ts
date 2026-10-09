import { sessionTitleMocks } from '@repo/api/mocks';
import {
  SessionInfo,
  SessionSnapshot,
  SessionRenameInput,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';

describe('Session title contracts', (): void => {
  it.each(sessionTitleMocks)(
    'preserves the $name App title mock for $session.agent',
    ({ session, snapshot, renameInput }): void => {
      expect(SessionInfo.parse(session)).toEqual(session);
      expect(SessionSnapshot.parse(snapshot)).toEqual(snapshot);
      expect(SessionRenameInput.parse(renameInput)).toEqual(renameInput);
    },
  );

  it.each([
    { sessionId: 'session-1' },
    { sessionId: 'session-1', title: 42 },
    { sessionId: 'session-1', title: 'Title', titleSource: 'agent' },
  ])('rejects malformed rename mock input: %j', (input): void => {
    expect(SessionRenameInput.safeParse(input).success).toBe(false);
  });

  it('rejects an unrecognised title source in the list and snapshot', (): void => {
    const mock = sessionTitleMocks[0];
    if (!mock) throw new Error('Missing title mock');
    expect(
      SessionInfo.safeParse({ ...mock.session, titleSource: 'unknown' })
        .success,
    ).toBe(false);
    expect(
      SessionSnapshot.safeParse({ ...mock.snapshot, titleSource: 'unknown' })
        .success,
    ).toBe(false);
  });
});
