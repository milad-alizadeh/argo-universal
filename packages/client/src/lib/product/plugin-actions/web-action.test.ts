import { expect, it } from 'vitest';
import { mayRun } from './web-action';

it.each(['javascript:alert(1)', 'file:///etc/passwd', 'intent://x#Intent;end'])(
  'refuses openUrl and share with %s',
  (url) => {
    expect(mayRun({ action: 'openUrl', url })).toBe(false);
    expect(mayRun({ action: 'share', message: 'hi', url })).toBe(false);
  },
);

it('allows http and https URLs', () => {
  expect(mayRun({ action: 'openUrl', url: 'https://example.com/a?b=1' })).toBe(
    true,
  );
  expect(
    mayRun({ action: 'share', message: 'hi', url: 'http://example.com' }),
  ).toBe(true);
});

it('allows a share without a URL and Actions that carry none', () => {
  expect(mayRun({ action: 'share', message: 'hi' })).toBe(true);
  expect(mayRun({ action: 'pop' })).toBe(true);
});
