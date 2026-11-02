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

const copy = { action: 'copy', text: 'WDJB-MJHT' };

it.each([
  ['https://example.com', true],
  ['javascript:alert(1)', false],
])('holds each step of a sequence to the URL rule: %s', (url, allowed) => {
  const sequence = {
    action: 'sequence',
    steps: [copy, { action: 'openUrl', url }],
  };

  expect(Action.safeParse(sequence).success).toBe(allowed);
});

it('needs at least two steps for a sequence', () => {
  const sequence = { action: 'sequence', steps: [copy] };

  expect(Action.safeParse(sequence).success).toBe(false);
});
