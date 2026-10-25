import type { LookupFunction } from 'node:net';
import { expect, it } from 'vitest';
import { PreviewUnavailable } from './preview-unavailable';
import { previewUrl, readPreviewUrl } from './read-url';

const rebound: LookupFunction = (_host, _options, callback): void =>
  callback(null, [{ address: '127.0.0.1', family: 4 }]);

it('refuses DNS rebinding before opening a connection', async () => {
  await expect(
    readPreviewUrl('https://public-looking.example.com/', rebound),
  ).rejects.toThrow('private address');
  await expect(
    readPreviewUrl('https://public-looking.example.com/', rebound),
  ).rejects.toBeInstanceOf(PreviewUnavailable);
});

it.each([
  'not a url',
  'file:///etc/passwd',
  'https://user:secret@example.com',
  'http://127.0.0.1',
])('expects %s to be refused as an unavailable preview', (href) => {
  expect(() => previewUrl(href)).toThrow(PreviewUnavailable);
});

it('reads a public page address with its fragment removed', () => {
  expect(previewUrl('https://example.com/guide#intro').href).toBe(
    'https://example.com/guide',
  );
});
