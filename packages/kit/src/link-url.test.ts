import { expect, it } from 'vitest';
import { isLinkUrl } from './link-url';

it.each([
  'https://example.com/a%20b',
  'http://localhost:3000',
  'mailto:someone@example.com',
])('follows %s', (text) => {
  expect(isLinkUrl(text)).toBe(true);
});

// A path an Agent writes is text, however it is spelt, and so is a link of a scheme Argo does not open.
it.each([
  '/work/checkout/qa-note.txt',
  'src/qa-note.txt',
  '/work/my%20checkout/qa%20note.txt',
  '/work/caf%C3%A9/note-%E6%97%A5.txt',
  '/settings',
  'file:///etc/hosts',
  'javascript:alert(1)',
  'https://example.com/a b',
])('leaves %s as text', (text) => {
  expect(isLinkUrl(text)).toBe(false);
});
