import { expect, it } from 'vitest';
import { Action } from './wire';

it.each([
  'javascript:alert(1)',
  'file:///etc/passwd',
  'argo://run',
  'data:text/html,test',
])('refuses %s in both Device URL actions', (url) => {
  expect(Action.safeParse({ action: 'openUrl', url }).success).toBe(false);
  expect(
    Action.safeParse({ action: 'share', url, message: 'See this' }).success,
  ).toBe(false);
});

it.each(['https://github.com/milad', 'http://example.com/'])(
  'allows %s for opening and sharing',
  (url) => {
    expect(Action.safeParse({ action: 'openUrl', url }).success).toBe(true);
    expect(
      Action.safeParse({ action: 'share', url, message: 'See this' }).success,
    ).toBe(true);
  },
);
