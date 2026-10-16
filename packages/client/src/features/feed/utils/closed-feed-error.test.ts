import { expect, it } from 'vitest';
import { closedFeedError } from './closed-feed-error';

const agentExited = 'Agent exited';

it.each([
  {
    case: 'the Agent’s sign-in',
    event: { failure: agentExited, openError: { type: 'auth-required' } },
    openError: { type: 'auth-required' },
  },
  {
    case: 'any other failure as a launch failure',
    event: { failure: agentExited },
    openError: { type: 'failed', message: agentExited },
  },
] as const)('reads $case from a closed Feed', ({ event, openError }) => {
  expect(closedFeedError({ type: 'closed', ...event })).toMatchObject({
    openError,
  });
});

it('reads no failure from a quiet close', () => {
  expect(closedFeedError({ type: 'closed', failure: null })).toBeNull();
});
