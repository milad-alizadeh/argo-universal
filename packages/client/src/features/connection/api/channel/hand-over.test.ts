import { expect, it } from 'vitest';
import { aead } from './aead';
import { ChannelCipher } from './channel-cipher';
import { CipherState } from './cipher-state';

const key = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

it('says which record number each direction has reached, so the module carries on from it', () => {
  const server = new ChannelCipher(
    new CipherState(key(2), aead),
    new CipherState(key(1), aead),
  );

  const app = new ChannelCipher(
    new CipherState(key(1), aead),
    new CipherState(key(2), aead),
  );

  app.open(server.seal(new Uint8Array([1])));
  app.open(server.seal(new Uint8Array([2])));
  server.open(app.seal(new Uint8Array([3])));

  expect(app.position()).toEqual({
    sending: { key: key(1), records: 1 },
    receiving: { key: key(2), records: 2 },
  });
});
