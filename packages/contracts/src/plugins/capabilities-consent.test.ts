import { expect, it } from 'vitest';
import { consentCopy, PluginCapability } from './capabilities';

it('names archiving Sessions in the consent copy of sessions:archive', () => {
  const capability = PluginCapability.parse({ kind: 'sessions:archive' });

  expect(consentCopy(capability)).toBe('May archive Sessions in its Projects');
});

it('accepts sessions:archive only with no other keys', () => {
  expect(
    PluginCapability.safeParse({ kind: 'sessions:archive', extra: 1 }).success,
  ).toBe(false);
});
