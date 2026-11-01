import { expect, it } from 'vitest';
import { operations } from './index';

const { params, result } = operations['app.open'];

it('takes one typed destination and nothing that is an address or an Operation', () => {
  expect(
    params.safeParse({ destination: { screen: 'session', sessionId: 's1' } })
      .success,
  ).toBe(true);

  for (const bad of [
    {},
    { destination: { screen: 'session' } },
    { destination: { screen: 'route', href: '/settings' } },
    { destination: { screen: 'sessions' }, href: '/settings' },
    { destination: { screen: 'session', sessionId: '../x' } },
    { link: 'argo://open/a/sessions' },
  ])
    expect(params.safeParse(bad).success).toBe(false);
});

it('answers delivered or not_opened, never opened', () => {
  const link = 'argo://open/server/sessions';

  expect(result.safeParse({ status: 'delivered', link }).success).toBe(true);
  expect(result.safeParse({ status: 'not_opened', link }).success).toBe(true);
  expect(result.safeParse({ status: 'opened', link }).success).toBe(false);
  expect(result.safeParse({ status: 'not_opened' }).success).toBe(false);
});

it('acts within the caller’s scope', () => {
  expect(operations['app.open'].tier).toBe('act');
});
