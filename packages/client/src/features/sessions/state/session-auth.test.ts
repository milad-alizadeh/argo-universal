import type { AgentAuthChange } from '@repo/contracts';
import { expect, it } from 'vitest';
import { finishedSignIn } from './session-auth';

const change = (
  pending: AgentAuthChange['pending'],
  outcome: AgentAuthChange['outcome'],
): AgentAuthChange => ({ methods: [], pending, outcome });

it.each([
  {
    case: 'a running sign-in that succeeds',
    wasPending: true,
    next: change(null, { status: 'ok' }),
    finished: true,
  },
  {
    case: 'a running sign-in that fails',
    wasPending: true,
    next: change(null, { status: 'failed', message: 'Closed' }),
    finished: false,
  },
  {
    case: 'a later auth_required that repeats the last success',
    wasPending: false,
    next: change(null, { status: 'ok' }),
    finished: false,
  },
  {
    case: 'a sign-in that starts',
    wasPending: false,
    next: change({ methodId: 'chatgpt' }, null),
    finished: false,
  },
])('$case finishes sign-in: $finished', ({ wasPending, next, finished }) => {
  expect(finishedSignIn(wasPending, next)).toBe(finished);
});
