import type { LookupFunction } from 'node:net';
import { expect, it } from 'vitest';
import { readPreviewUrl } from './read-url';

const rebound: LookupFunction = (_host, _options, callback): void =>
  callback(null, [{ address: '127.0.0.1', family: 4 }]);

it('refuses DNS rebinding before opening a connection', async () => {
  await expect(
    readPreviewUrl('https://public-looking.example.com/', rebound),
  ).rejects.toThrow('private address');
});
