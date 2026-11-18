import { expect, it } from 'vitest';
import { consentCopy, PluginCapability } from './capabilities';

it('names archiving Sessions in the consent copy of sessions:archive', () => {
  const capability = PluginCapability.parse({ kind: 'sessions:archive' });

  expect(consentCopy(capability)).toBe('May archive Sessions in its Projects');
});

it('names starting Turns in the consent copy of sessions:prompt', () => {
  const capability = PluginCapability.parse({ kind: 'sessions:prompt' });

  expect(consentCopy(capability)).toBe('May start Turns in its Projects');
});

it('accepts sessions:archive only with no other keys', () => {
  expect(
    PluginCapability.safeParse({ kind: 'sessions:archive', extra: 1 }).success,
  ).toBe(false);
});

it('shows a subdomain pattern verbatim in consent copy', () => {
  const capability = PluginCapability.parse({
    kind: 'fetch',
    host: '*.atlassian.net',
  });

  expect(consentCopy(capability)).toBe('May reach *.atlassian.net');
});

it.each([
  '*.net',
  'te*m.atlassian.net',
  'team.atlassian.net:*',
  '*.atlassian.net:8443',
])('refuses the invalid fetch host %s', (host) => {
  expect(PluginCapability.safeParse({ kind: 'fetch', host }).success).toBe(
    false,
  );
});
