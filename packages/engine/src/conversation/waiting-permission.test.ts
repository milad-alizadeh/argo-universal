import { expect, it } from 'vitest';
import { WaitingPermission } from './waiting-permission';

const deploy = {
  type: 'permission.waiting',
  requestId: 'p1',
  agent: 'Codex',
  title: 'Run npm run deploy',
  kind: 'execute',
  target: 'npm run deploy',
} as const;

// The relay's waiting request, and the clock the test moves.
type Clocked = { permission: WaitingPermission; at: { now: number } };

function waitingAt(): Clocked {
  const at = { now: 0 };

  return { permission: new WaitingPermission(() => at.now), at };
}

it('still names a request a moment after it settles, for an answer said as it was clicked', () => {
  const { permission, at } = waitingAt();

  permission.heard(deploy);
  permission.heard({ type: 'permission.settled', requestId: 'p1' });
  at.now = 2000;

  expect(permission.announced?.requestId).toBe('p1');
});

it('forgets a settled request soon after, so a later "yes" is a request for work again', () => {
  const { permission, at } = waitingAt();

  permission.heard(deploy);
  permission.heard({ type: 'permission.settled', requestId: 'p1' });
  at.now = 6000;

  expect(permission.announced).toBeNull();
});

it('names a waiting request however long it waits', () => {
  const { permission, at } = waitingAt();

  permission.heard(deploy);
  at.now = 60_000;

  expect(permission.announced?.requestId).toBe('p1');
});
