import { expect, it } from 'vitest';
import { SessionInfo } from './list';
import { SessionRenameInput } from './rename';
import { SessionSnapshot } from './snapshot';

it.each([
  { sessionId: 'session-1' },
  { sessionId: 'session-1', title: 42 },
  { sessionId: 'session-1', title: 'Title', titleSource: 'agent' },
])('rejects malformed rename input: %j', (input) => {
  expect(SessionRenameInput.safeParse(input).success).toBe(false);
});

it.each(['prompt', 'agent', 'user'] as const)(
  'accepts the %s title source in list and snapshot contracts',
  (source) => {
    expect(SessionInfo.shape.titleSource.parse(source)).toBe(source);
    expect(SessionSnapshot.shape.titleSource.parse(source)).toBe(source);
  },
);

it('rejects an unrecognised title source in list and snapshot contracts', () => {
  expect(SessionInfo.shape.titleSource.safeParse('unknown').success).toBe(
    false,
  );
  expect(SessionSnapshot.shape.titleSource.safeParse('unknown').success).toBe(
    false,
  );
});
